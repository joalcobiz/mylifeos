
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Place, PlaceType, PlaceEvent } from '../../types';
import { Search, Loader2, Sparkles, MapPin, Calendar, Plus, Trash2, Globe, Star, FileText, Navigation, ChevronDown, ChevronUp, Edit3, Clock, Phone, DollarSign, CheckCircle, Building, Tag, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { searchPlaceDetails } from '../../services/gemini';

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlaceDetails {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  lat?: number;
  lng?: number;
  openingHours?: string[];
  phoneNumber?: string;
  priceLevel?: number;
  rating?: number;
  totalRatings?: number;
  types?: string[];
  placeId?: string;
}

interface PlaceFormProps {
  initialData?: Partial<Place>;
  existingPlaces?: Place[];
  onSave: (place: Omit<Place, 'id'>) => void;
  onCancel: () => void;
}

const PlaceForm: React.FC<PlaceFormProps> = ({ initialData, existingPlaces = [], onSave, onCancel }) => {
  const isEditing = !!initialData?.id;
  
  const [formData, setFormData] = useState<Partial<Place>>(initialData || {
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    type: PlaceType.Restaurant,
    rating: 0,
    notes: '',
    website: '',
    lat: undefined,
    lng: undefined,
    events: []
  });

  const [newEvent, setNewEvent] = useState<Partial<PlaceEvent>>({
    name: '',
    type: 'Event',
    startDate: '',
    endDate: '',
    notes: ''
  });

  const [entryMode, setEntryMode] = useState<'search' | 'manual'>(isEditing ? 'manual' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [googlePredictions, setGooglePredictions] = useState<GooglePlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [googleDetails, setGoogleDetails] = useState<GooglePlaceDetails | null>(null);
  const [showEventsSection, setShowEventsSection] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Place | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  const predictionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track if this is a manual entry without Google data
  const isIncomplete = useMemo(() => {
    return entryMode === 'manual' && !formData.googleMapsData?.placeId && !isEditing;
  }, [entryMode, formData.googleMapsData, isEditing]);

  // Normalize string for comparison (remove special chars, extra spaces)
  const normalizeForComparison = (str: string): string => {
    return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  };

  // Simple similarity check - returns true if names are very similar
  const isSimilarName = (name1: string, name2: string): boolean => {
    const n1 = normalizeForComparison(name1);
    const n2 = normalizeForComparison(name2);
    
    // Exact match after normalization
    if (n1 === n2) return true;
    
    // Check if one starts with the other (for partial matches like "Joe's" vs "Joe's Pizza")
    if (n1.length >= 5 && n2.length >= 5) {
      if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
    }
    
    return false;
  };

  // Check for duplicates when name changes
  useEffect(() => {
    if (!formData.name || formData.name.length < 3) {
      setDuplicateWarning(null);
      return;
    }
    
    const duplicate = existingPlaces.find(p => {
      // Skip self when editing
      if (isEditing && p.id === initialData?.id) return false;
      return isSimilarName(formData.name!, p.name);
    });
    
    setDuplicateWarning(duplicate || null);
  }, [formData.name, existingPlaces, isEditing, initialData?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (predictionsRef.current && !predictionsRef.current.contains(event.target as Node) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchGooglePredictions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setGooglePredictions([]);
      return;
    }

    setIsLoadingPredictions(true);
    try {
      const response = await fetch('/api/places-new:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query })
      });
      const data = await response.json();
      
      if (data.suggestions) {
        const predictions = data.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text?.text || '',
            structured_formatting: {
              main_text: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
              secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text || ''
            }
          }));
        setGooglePredictions(predictions);
        setShowPredictions(true);
      } else {
        setGooglePredictions([]);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setGooglePredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchGooglePredictions(value);
    }, 300);
  };

  const fetchPlaceDetails = async (placeId: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/places-detailed/${placeId}`);
      const data = await response.json();
      
      if (data.displayName || data.formattedAddress) {
        let city = '';
        let state = '';
        let country = '';
        
        if (data.addressComponents) {
          data.addressComponents.forEach((component: any) => {
            if (component.types?.includes('locality')) {
              city = component.longText || '';
            }
            if (component.types?.includes('administrative_area_level_1')) {
              state = component.shortText || '';
            }
            if (component.types?.includes('country')) {
              country = component.longText || '';
            }
          });
        }
        
        let placeType = PlaceType.Other;
        if (data.types) {
          if (data.types.includes('restaurant')) placeType = PlaceType.Restaurant;
          else if (data.types.includes('cafe')) placeType = PlaceType.Cafe;
          else if (data.types.includes('park')) placeType = PlaceType.Park;
          else if (data.types.includes('museum')) placeType = PlaceType.Museum;
          else if (data.types.includes('gym')) placeType = PlaceType.Gym;
          else if (data.types.includes('library')) placeType = PlaceType.Library;
          else if (data.types.includes('store') || data.types.includes('shopping_mall')) placeType = PlaceType.Shop;
        }

        const priceLevelMap: Record<string, number> = {
          'PRICE_LEVEL_FREE': 0,
          'PRICE_LEVEL_INEXPENSIVE': 1,
          'PRICE_LEVEL_MODERATE': 2,
          'PRICE_LEVEL_EXPENSIVE': 3,
          'PRICE_LEVEL_VERY_EXPENSIVE': 4
        };

        const details: GooglePlaceDetails = {
          name: data.displayName?.text || '',
          address: data.formattedAddress || '',
          city,
          state,
          country,
          website: data.websiteUri || '',
          lat: data.location?.latitude,
          lng: data.location?.longitude,
          openingHours: data.regularOpeningHours?.weekdayDescriptions,
          phoneNumber: data.nationalPhoneNumber || '',
          priceLevel: data.priceLevel ? priceLevelMap[data.priceLevel] : undefined,
          rating: data.rating,
          totalRatings: data.userRatingCount,
          types: data.types,
          placeId
        };

        setGoogleDetails(details);
      }
    } catch (error) {
      console.error('Place details error:', error);
    } finally {
      setIsSearching(false);
      setShowPredictions(false);
      setGooglePredictions([]);
    }
  };

  const handleSelectPrediction = (prediction: GooglePlacePrediction) => {
    setSearchQuery(prediction.description);
    fetchPlaceDetails(prediction.place_id);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await searchPlaceDetails(searchQuery);
      if (result) {
        setFormData(prev => ({
          ...prev,
          name: result.name || prev.name,
          address: result.address || prev.address,
          city: result.city || prev.city,
          state: result.state || prev.state,
          website: result.website || prev.website,
          type: result.type && Object.values(PlaceType).includes(result.type) ? result.type : prev.type,
          lat: result.latitude || prev.lat,
          lng: result.longitude || prev.lng
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmGoogleDetails = () => {
    if (!googleDetails) return;
    
    let placeType = formData.type || PlaceType.Other;
    if (googleDetails.types) {
      if (googleDetails.types.includes('restaurant')) placeType = PlaceType.Restaurant;
      else if (googleDetails.types.includes('cafe')) placeType = PlaceType.Cafe;
      else if (googleDetails.types.includes('park')) placeType = PlaceType.Park;
      else if (googleDetails.types.includes('museum')) placeType = PlaceType.Museum;
      else if (googleDetails.types.includes('gym')) placeType = PlaceType.Gym;
      else if (googleDetails.types.includes('library')) placeType = PlaceType.Library;
      else if (googleDetails.types.includes('store') || googleDetails.types.includes('shopping_mall')) placeType = PlaceType.Shop;
    }

    setFormData(prev => ({
      ...prev,
      name: googleDetails.name || prev.name,
      address: googleDetails.address || prev.address,
      city: googleDetails.city || prev.city,
      state: googleDetails.state || prev.state,
      country: googleDetails.country || prev.country,
      website: googleDetails.website || prev.website,
      type: placeType,
      lat: googleDetails.lat || prev.lat,
      lng: googleDetails.lng || prev.lng,
      rating: Math.round(googleDetails.rating || 0),
      googleMapsData: {
        placeId: googleDetails.placeId,
        formattedAddress: googleDetails.address,
        website: googleDetails.website,
        types: googleDetails.types
      }
    }));
    setGoogleDetails(null);
    setEntryMode('manual');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.startDate) return;
    
    const eventToAdd: PlaceEvent = {
      id: `pe-${Date.now()}`,
      name: newEvent.name,
      type: newEvent.type as any,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate || newEvent.startDate,
      notes: newEvent.notes || ''
    };

    setFormData(prev => ({
      ...prev,
      events: [...(prev.events || []), eventToAdd]
    }));

    setNewEvent({ name: '', type: 'Event', startDate: '', endDate: '', notes: '' });
  };

  const handleRemoveEvent = (id: string) => {
    setFormData(prev => ({
      ...prev,
      events: (prev.events || []).filter(e => e.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show duplicate warning modal if there's a potential duplicate
    if (duplicateWarning && !showDuplicateModal) {
      setShowDuplicateModal(true);
      return;
    }
    
    if (formData.name) {
      const placeData: Omit<Place, 'id'> = {
        ...formData,
        name: formData.name,
        type: formData.type || PlaceType.Other,
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        rating: formData.rating || 0,
        notes: formData.notes || '',
        visitedCount: formData.visitedCount || 0,
        isIncomplete: isIncomplete
      } as Omit<Place, 'id'>;
      
      onSave(placeData);
    }
  };

  const handleSaveAnyway = () => {
    setShowDuplicateModal(false);
    if (formData.name) {
      const placeData: Omit<Place, 'id'> = {
        ...formData,
        name: formData.name,
        type: formData.type || PlaceType.Other,
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        rating: formData.rating || 0,
        notes: formData.notes || '',
        visitedCount: formData.visitedCount || 0,
        isIncomplete: isIncomplete
      } as Omit<Place, 'id'>;
      
      onSave(placeData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Name Field - Always First */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Place Name</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="Enter the place name..."
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {duplicateWarning && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            Similar place exists: "{duplicateWarning.name}"
          </div>
        )}
      </div>

      {/* Google Search - Optional */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-green-600" />
          Search Google Places <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
            placeholder="Search to auto-fill address, coordinates, hours..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-spin" />
          )}
          
          {showPredictions && (googlePredictions.length > 0 || isLoadingPredictions) && (
            <div 
              ref={predictionsRef}
              className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              {isLoadingPredictions && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                </div>
              )}
              {!isLoadingPredictions && googlePredictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-green-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                >
                  <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">Type 3+ characters to search Google</p>
      </div>

      {/* Google Details Preview */}
      {googleDetails && (
        <div className="bg-white rounded-lg border-2 border-green-300 shadow-lg overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Google Data Found</span>
            </div>
            <button type="button" onClick={() => setGoogleDetails(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Main Info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm">{googleDetails.name}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{googleDetails.address}</p>
              </div>
            </div>

            {/* Rating & Price */}
            <div className="flex items-center gap-2 flex-wrap">
              {googleDetails.rating && (
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-xs font-medium text-amber-700">
                  <Star className="w-3 h-3" fill="currentColor" /> {googleDetails.rating}
                  {googleDetails.totalRatings && (
                    <span className="text-amber-600">({googleDetails.totalRatings})</span>
                  )}
                </div>
              )}
              {googleDetails.priceLevel && (
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-xs font-medium text-green-700">
                  <DollarSign className="w-3 h-3" />
                  {'$'.repeat(googleDetails.priceLevel)}
                </div>
              )}
              {googleDetails.phoneNumber && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs font-medium text-blue-700">
                  <Phone className="w-3 h-3" /> {googleDetails.phoneNumber}
                </div>
              )}
            </div>

            {/* Use This Data Button */}
            <button
              type="button"
              onClick={handleConfirmGoogleDetails}
              className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Use This Data
            </button>
          </div>
        </div>
      )}

      {/* Enriched indicator */}
      {formData.googleMapsData?.placeId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-green-700">Enriched with Google data</span>
        </div>
      )}

      {/* Type & Rating Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {Object.values(PlaceType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Rating</label>
          <div className="flex gap-1 py-1.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                className={`w-8 h-8 rounded-lg transition-all ${
                  (formData.rating || 0) >= star 
                    ? 'bg-amber-100 text-amber-500' 
                    : 'bg-gray-100 text-gray-300 hover:bg-amber-50'
                }`}
              >
                <Star className="w-4 h-4 mx-auto" fill={(formData.rating || 0) >= star ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <Navigation size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-xs text-gray-500">Address and coordinates</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">City</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">State</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="ST"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Country</label>
                  <input
                    name="country"
                    value={formData.country || ''}
                    onChange={handleChange}
                    placeholder="US"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    value={formData.lat || ''}
                    onChange={handleChange}
                    placeholder="45.5152"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    value={formData.lng || ''}
                    onChange={handleChange}
                    placeholder="-122.6784"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Additional Info</h3>
                <p className="text-xs text-gray-500">Website and personal notes</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Website</label>
                <input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Personal notes..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Events Section - Collapsible */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEventsSection(!showEventsSection)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Calendar size={18} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Events & Best Times</h3>
                  <p className="text-xs text-gray-500">
                    {formData.events && formData.events.length > 0 
                      ? `${formData.events.length} event${formData.events.length !== 1 ? 's' : ''} added`
                      : 'Festivals, peak seasons, best times to visit'
                    }
                  </p>
                </div>
              </div>
              {showEventsSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {showEventsSection && (
              <div className="p-4 space-y-4 bg-white animate-fade-in">
                {/* Existing Events List */}
                {formData.events && formData.events.length > 0 && (
                  <div className="space-y-2">
                    {formData.events.map(event => (
                      <div key={event.id} className="p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                event.type === 'Event' ? 'bg-purple-100 text-purple-700' :
                                event.type === 'Best Time' ? 'bg-green-100 text-green-700' :
                                event.type === 'Season' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{event.type}</span>
                              <span className="text-sm font-medium text-gray-900">{event.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Clock size={10} />
                              <span>{event.startDate}{event.endDate && event.endDate !== event.startDate ? ` - ${event.endDate}` : ''}</span>
                            </div>
                            {event.notes && (
                              <p className="mt-1.5 text-xs text-gray-500 italic">{event.notes}</p>
                            )}
                          </div>
                          <button type="button" onClick={() => handleRemoveEvent(event.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Event Form */}
                <div className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 rounded-xl p-3 border border-cyan-100/50 space-y-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add New</div>
                  
                  {/* Type Selection */}
                  <div className="flex gap-2">
                    {(['Event', 'Best Time', 'Season'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({...newEvent, type, startDate: '', endDate: ''})}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          newEvent.type === type 
                            ? type === 'Event' ? 'bg-purple-500 text-white shadow-sm' :
                              type === 'Best Time' ? 'bg-green-500 text-white shadow-sm' :
                              'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Event Name */}
                  <input 
                    type="text" 
                    placeholder={
                      newEvent.type === 'Event' ? 'e.g., Jazz Festival, Art Show' :
                      newEvent.type === 'Best Time' ? 'e.g., Sunset viewing, Brunch crowd-free' :
                      'e.g., Fall colors, Cherry blossom'
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                    value={newEvent.name}
                    onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                  />

                  {/* Dynamic Date Input based on Type */}
                  {newEvent.type === 'Event' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Date</label>
                        <input 
                          type="date" 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.startDate}
                          onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">End Date</label>
                        <input 
                          type="date" 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.endDate}
                          onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {newEvent.type === 'Best Time' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Time of Day</label>
                        <select 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.startDate}
                          onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                        >
                          <option value="">Select time...</option>
                          <option value="Early Morning (5-8am)">Early Morning (5-8am)</option>
                          <option value="Morning (8-11am)">Morning (8-11am)</option>
                          <option value="Midday (11am-2pm)">Midday (11am-2pm)</option>
                          <option value="Afternoon (2-5pm)">Afternoon (2-5pm)</option>
                          <option value="Evening (5-8pm)">Evening (5-8pm)</option>
                          <option value="Night (8pm+)">Night (8pm+)</option>
                          <option value="Weekdays">Weekdays</option>
                          <option value="Weekends">Weekends</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Month (optional)</label>
                        <select 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.endDate}
                          onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                        >
                          <option value="">Any month</option>
                          <option value="January">January</option>
                          <option value="February">February</option>
                          <option value="March">March</option>
                          <option value="April">April</option>
                          <option value="May">May</option>
                          <option value="June">June</option>
                          <option value="July">July</option>
                          <option value="August">August</option>
                          <option value="September">September</option>
                          <option value="October">October</option>
                          <option value="November">November</option>
                          <option value="December">December</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {newEvent.type === 'Season' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Season</label>
                        <select 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.startDate}
                          onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                        >
                          <option value="">Select season...</option>
                          <option value="Spring (Mar-May)">Spring (Mar-May)</option>
                          <option value="Summer (Jun-Aug)">Summer (Jun-Aug)</option>
                          <option value="Fall (Sep-Nov)">Fall (Sep-Nov)</option>
                          <option value="Winter (Dec-Feb)">Winter (Dec-Feb)</option>
                          <option value="Year-round">Year-round</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Peak Month (optional)</label>
                        <select 
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400"
                          value={newEvent.endDate}
                          onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                        >
                          <option value="">Select peak...</option>
                          <option value="Early">Early in season</option>
                          <option value="Mid">Mid season</option>
                          <option value="Late">Late in season</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Notes (optional)</label>
                    <textarea 
                      placeholder="Any tips or details..."
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 resize-none"
                      value={newEvent.notes}
                      onChange={e => setNewEvent({...newEvent, notes: e.target.value})}
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddEvent}
                    disabled={!newEvent.name || !newEvent.startDate}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Plus size={14} /> Add {newEvent.type || 'Event'}
                  </button>
                </div>
              </div>
            )}
          </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!formData.name || (entryMode === 'search' && !!googleDetails)}
          className="px-4 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5" />
          {isEditing ? 'Update' : (isIncomplete ? 'Save as Draft' : 'Save Place')}
        </button>
      </div>

      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && duplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Possible Duplicate</h3>
                <p className="text-xs text-gray-500">A similar place already exists</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Existing:</span> {duplicateWarning.name}
              </p>
              {duplicateWarning.city && (
                <p className="text-xs text-gray-500 mt-1">{duplicateWarning.city}, {duplicateWarning.state}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleSaveAnyway}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default PlaceForm;
