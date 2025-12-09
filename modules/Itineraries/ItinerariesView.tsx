import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
    Plus, Route, Calendar, Archive, CheckCircle, Clock, Trash2, MapPin, 
    ArrowUp, ArrowDown, Edit2, Plane, ChevronDown, ChevronRight, GripVertical,
    MessageSquare, FileText, X, Download, List, LayoutGrid, Sun, Moon, Sunset,
    Sunrise, Coffee, Utensils, Building, Camera, TreePine, Waves, ShoppingBag, 
    Music, Bus, HelpCircle, BookOpen, ExternalLink, Search, Loader2, Star, Globe,
    Share2, Link, Copy, Eye, EyeOff, Map as MapIcon, CloudSun, CloudMoon, Timer,
    DollarSign, Bookmark, Navigation, Maximize2, Minimize2, Upload, Image
} from 'lucide-react';
import { Itinerary, ItineraryStop, Place, StopPlaceType, JournalEntry, TimeBucket, StopSource } from '../../types';
import Modal from '../../components/Modal';
import { useFirestore } from '../../services/firestore';
import { db } from '../../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, Button, Badge, Input, Select, EmptyState, Tabs, Textarea } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';
import { generateItineraryPDF } from '../../utils/pdfItinerary';
import { uploadPhoto } from '../../services/storage';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';

interface GooglePrediction {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text: string;
        secondary_text: string;
    };
}

const STOP_PLACE_TYPES: { value: StopPlaceType; label: string; icon: any; color: string }[] = [
    { value: 'Restaurant', label: 'Restaurant', icon: Utensils, color: 'text-orange-500' },
    { value: 'Hotel', label: 'Hotel', icon: Building, color: 'text-blue-500' },
    { value: 'Attraction', label: 'Attraction', icon: Camera, color: 'text-purple-500' },
    { value: 'Museum', label: 'Museum', icon: Building, color: 'text-amber-600' },
    { value: 'Park', label: 'Park', icon: TreePine, color: 'text-green-500' },
    { value: 'Beach', label: 'Beach', icon: Waves, color: 'text-cyan-500' },
    { value: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
    { value: 'Entertainment', label: 'Entertainment', icon: Music, color: 'text-violet-500' },
    { value: 'Transport', label: 'Transport', icon: Bus, color: 'text-gray-500' },
    { value: 'Other', label: 'Other', icon: HelpCircle, color: 'text-gray-400' }
];

const TIME_BUCKETS: { 
    id: TimeBucket; 
    label: string; 
    range: string; 
    sortKey: string; 
    icon: any; 
    gradient: string;
    bgColor: string;
    textColor: string;
}[] = [
    { id: 'earlyMorning', label: 'Early Morning', range: '5:00 - 7:59', sortKey: '06:00', icon: Sunrise, gradient: 'from-rose-400 to-orange-400', bgColor: 'bg-rose-50', textColor: 'text-rose-600' },
    { id: 'morning', label: 'Morning', range: '8:00 - 11:29', sortKey: '09:00', icon: Sun, gradient: 'from-amber-400 to-yellow-400', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
    { id: 'midday', label: 'Midday', range: '11:30 - 13:00', sortKey: '12:00', icon: CloudSun, gradient: 'from-yellow-400 to-orange-400', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { id: 'earlyAfternoon', label: 'Early Afternoon', range: '13:01 - 15:29', sortKey: '14:00', icon: Sun, gradient: 'from-orange-400 to-amber-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { id: 'lateAfternoon', label: 'Late Afternoon', range: '15:30 - 17:59', sortKey: '16:00', icon: Coffee, gradient: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
    { id: 'evening', label: 'Evening', range: '18:00 - 20:29', sortKey: '19:00', icon: Sunset, gradient: 'from-purple-400 to-pink-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { id: 'night', label: 'Night', range: '20:30 - 23:59', sortKey: '21:30', icon: Moon, gradient: 'from-indigo-500 to-purple-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
    { id: 'lateNight', label: 'Late Night', range: '00:00 - 4:59', sortKey: '02:00', icon: CloudMoon, gradient: 'from-slate-600 to-indigo-700', bgColor: 'bg-slate-100', textColor: 'text-slate-600' }
];

const getTimeBucketFromTime = (time: string): TimeBucket | null => {
    if (!time) return null;
    const [hours] = time.split(':').map(Number);
    if (hours >= 5 && hours < 8) return 'earlyMorning';
    if (hours >= 8 && hours < 11.5) return 'morning';
    if (hours >= 11.5 && hours <= 13) return 'midday';
    if (hours > 13 && hours < 15.5) return 'earlyAfternoon';
    if (hours >= 15.5 && hours < 18) return 'lateAfternoon';
    if (hours >= 18 && hours < 20.5) return 'evening';
    if (hours >= 20.5 && hours < 24) return 'night';
    return 'lateNight';
};

const getTimeBucketInfo = (bucket?: TimeBucket) => {
    return TIME_BUCKETS.find(b => b.id === bucket) || TIME_BUCKETS[1];
};

const getTimeSegment = (time: string, bucket?: TimeBucket): { name: string; icon: any; color: string; gradient: string } => {
    if (bucket) {
        const info = getTimeBucketInfo(bucket);
        return { name: info.label, icon: info.icon, color: info.textColor, gradient: info.gradient };
    }
    if (!time) return { name: 'Unscheduled', icon: Clock, color: 'text-gray-400', gradient: 'from-gray-300 to-gray-400' };
    
    const derivedBucket = getTimeBucketFromTime(time);
    if (derivedBucket) {
        const info = getTimeBucketInfo(derivedBucket);
        return { name: info.label, icon: info.icon, color: info.textColor, gradient: info.gradient };
    }
    
    return { name: 'Unscheduled', icon: Clock, color: 'text-gray-400', gradient: 'from-gray-300 to-gray-400' };
};

const getPlaceTypeInfo = (type?: StopPlaceType) => {
    return STOP_PLACE_TYPES.find(t => t.value === type) || STOP_PLACE_TYPES[9];
};

const generateShareToken = () => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const getGoogleMapsKey = (): string => {
    try {
        return (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || '';
    } catch {
        return '';
    }
};

const MapPreview: React.FC<{ stop: ItineraryStop; expanded: boolean; onToggle: () => void }> = ({ stop, expanded, onToggle }) => {
    const hasLocation = stop.lat && stop.lng;
    const hasGooglePlace = stop.googlePlaceId;
    
    if (!hasLocation && !hasGooglePlace) return null;
    
    const mapsKey = getGoogleMapsKey();
    const mapUrl = hasLocation 
        ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${stop.lat},${stop.lng}&zoom=15`
        : `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=place_id:${stop.googlePlaceId}`;
    
    const staticMapUrl = hasLocation
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${stop.lat},${stop.lng}&zoom=14&size=400x200&markers=color:red%7C${stop.lat},${stop.lng}&key=${mapsKey}`
        : null;

    return (
        <div className="mt-2">
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
                <MapIcon size={12} />
                {expanded ? 'Hide Map' : 'Show Map'}
                {expanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
            </button>
            {expanded && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm animate-enter">
                    {staticMapUrl ? (
                        <img 
                            src={staticMapUrl} 
                            alt={`Map of ${stop.name}`}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <iframe
                            src={mapUrl}
                            className="w-full h-40 border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`Map of ${stop.name}`}
                        />
                    )}
                    <div className="p-2 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{stop.address || stop.name}</span>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}${stop.googlePlaceId ? `&query_place_id=${stop.googlePlaceId}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Navigation size={10} /> Directions
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

const CollapsibleDaySection: React.FC<{
    date: string;
    stops: ItineraryStop[];
    isCollapsed: boolean;
    onToggle: () => void;
    onToggleStop: (stopId: string) => void;
    onCompleteVisit: (stopId: string) => void;
    onEditNotes: (stopId: string, notes: string) => void;
    onEditStop: (stop: ItineraryStop) => void;
    itineraryId: string;
    dayNumber: number;
    totalDays: number;
}> = ({ date, stops, isCollapsed, onToggle, onToggleStop, onCompleteVisit, onEditNotes, onEditStop, dayNumber, totalDays }) => {
    const [expandedMaps, setExpandedMaps] = useState<Set<string>>(new Set());
    const [editingStopId, setEditingStopId] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState('');
    
    const completedCount = stops.filter(s => s.completed).length;
    const isToday = new Date(date).toDateString() === new Date().toDateString();
    const isPast = new Date(date) < new Date(new Date().toDateString());
    
    const groupedByTime = useMemo(() => {
        const groups: { [key: string]: ItineraryStop[] } = {};
        stops.forEach(stop => {
            const segment = getTimeSegment(stop.time || '', stop.timeBucket).name;
            if (!groups[segment]) groups[segment] = [];
            groups[segment].push(stop);
        });
        return groups;
    }, [stops]);

    const toggleMap = (stopId: string) => {
        setExpandedMaps(prev => {
            const next = new Set(prev);
            if (next.has(stopId)) next.delete(stopId);
            else next.add(stopId);
            return next;
        });
    };

    return (
        <div className={`rounded-xl overflow-hidden border transition-all ${
            isToday ? 'border-blue-300 shadow-lg shadow-blue-100' : 
            isPast ? 'border-gray-200 opacity-75' : 'border-gray-200'
        }`}>
            <button
                onClick={onToggle}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                    isToday ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                    isPast ? 'bg-gray-100 text-gray-600' : 'bg-gradient-to-r from-gray-50 to-white text-gray-800 hover:bg-gray-50'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isToday ? 'bg-white/20 text-white' : 
                        isPast ? 'bg-gray-200 text-gray-500' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md'
                    }`}>
                        {dayNumber}
                    </div>
                    <div className="text-left">
                        <div className="font-semibold flex items-center gap-2">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            {isToday && <Badge variant="warning" size="xs">Today</Badge>}
                        </div>
                        <div className={`text-xs ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                            {stops.length} stops • {completedCount} completed
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`h-1.5 w-24 rounded-full overflow-hidden ${isToday ? 'bg-white/30' : 'bg-gray-200'}`}>
                        <div 
                            className={`h-full transition-all ${isToday ? 'bg-white' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                            style={{ width: `${stops.length > 0 ? (completedCount / stops.length) * 100 : 0}%` }}
                        />
                    </div>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>
            
            {!isCollapsed && (
                <div className="p-4 bg-white/80 backdrop-blur-sm space-y-4 animate-enter">
                    {(Object.entries(groupedByTime) as [string, ItineraryStop[]][]).map(([segment, segmentStops]) => {
                        const segmentInfo = TIME_BUCKETS.find(b => b.label === segment) || TIME_BUCKETS[1];
                        const SegmentIcon = segmentInfo.icon;
                        
                        return (
                            <div key={segment} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${segmentInfo.gradient} flex items-center justify-center text-white shadow-sm`}>
                                        <SegmentIcon size={12} />
                                    </div>
                                    <span className={`text-sm font-medium ${segmentInfo.textColor}`}>{segment}</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                                </div>
                                
                                <div className="pl-8">
                                    {segmentStops.map((stop, idx) => {
                                        const placeTypeInfo = getPlaceTypeInfo(stop.placeType);
                                        const PlaceIcon = placeTypeInfo.icon;
                                        
                                        return (
                                            <div 
                                                key={stop.id}
                                                className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all hover:bg-gray-50 ${
                                                    stop.completed ? 'opacity-60' : ''
                                                }`}
                                            >
                                                <button
                                                    onClick={() => onToggleStop(stop.id)}
                                                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                                        stop.completed
                                                            ? 'bg-green-500 text-white'
                                                            : 'border border-gray-300 text-transparent hover:border-green-400'
                                                    }`}
                                                >
                                                    <CheckCircle size={10} />
                                                </button>
                                                
                                                <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">#{idx + 1}</span>
                                                
                                                <div className={`w-5 h-5 rounded flex items-center justify-center ${placeTypeInfo.color} bg-gray-100 flex-shrink-0`}>
                                                    <PlaceIcon size={10} />
                                                </div>
                                                
                                                <span className={`font-medium text-sm truncate flex-1 min-w-0 ${stop.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {stop.name}
                                                </span>
                                                
                                                {stop.time && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                                                        <Clock size={10} />
                                                        {stop.time}
                                                    </span>
                                                )}
                                                
                                                {stop.placeType && stop.placeType !== 'Other' && (
                                                    <Badge variant="default" size="xs" className="flex-shrink-0">{stop.placeType}</Badge>
                                                )}
                                                
                                                {stop.address && (
                                                    <span className="text-xs text-gray-400 truncate max-w-[120px] hidden md:block flex-shrink-0">
                                                        {stop.address.split(',')[0]}
                                                    </span>
                                                )}
                                                
                                                {stop.notes && (
                                                    <MessageSquare size={10} className="text-gray-400 flex-shrink-0" title={stop.notes} />
                                                )}
                                                
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <button
                                                        onClick={() => onEditStop(stop)}
                                                        className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                        title="Edit stop"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    {!stop.completed && (
                                                        <button
                                                            onClick={() => onCompleteVisit(stop.id)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Add journal entry"
                                                        >
                                                            <BookOpen size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {stop.journalEntryId && (
                                                    <span className="text-[10px] text-green-600 flex items-center gap-0.5 flex-shrink-0">
                                                        <CheckCircle size={8} /> Journaled
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ItinerariesView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: itineraries, add: addItinerary, update: updateItinerary, remove: removeItinerary } = useFirestore<Itinerary>('itineraries');
    const { data: places } = useFirestore<Place>('places');
    const { add: addJournalEntry } = useFirestore<JournalEntry>('journal');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('trips'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: itineraries.length,
            mine: itineraries.filter(i => i.owner === userId).length,
            shared: itineraries.filter(i => 
                i.owner !== userId && (i.isShared || i.sharedWith?.includes(userId))
            ).length,
            assigned: itineraries.filter(i => 
                (i as any).assignedTo === userId && i.owner !== userId
            ).length
        };
    }, [itineraries, user]);

    const filteredBySharingItineraries = useMemo(() => {
        return filterDataBySharing<Itinerary>(
            itineraries, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
    }, [itineraries, user, sharingMode, isAdmin]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Planned' | 'In Progress' | 'Completed'>('All');
    const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareItinerary, setShareItinerary] = useState<Itinerary | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    
    const [formData, setFormData] = useState<{name: string, start: string, end: string, notes: string, theme: Itinerary['theme']}>({ 
        name: '', start: '', end: '', notes: '', theme: 'default' 
    });
    const [stops, setStops] = useState<ItineraryStop[]>([]);
    const [tempStop, setTempStop] = useState<{
        placeId: string, 
        googlePlaceId: string,
        name: string, 
        address: string,
        date: string, 
        time: string, 
        timeMode: 'fixed' | 'bucket',
        timeBucket: TimeBucket | '',
        notes: string, 
        placeType: StopPlaceType,
        photos: string[],
        lat?: number,
        lng?: number
    }>({ 
        placeId: '', googlePlaceId: '', name: '', address: '', date: '', time: '', 
        timeMode: 'fixed', timeBucket: '', notes: '', placeType: 'Other', photos: []
    });
    const [entryMode, setEntryMode] = useState<'lookup' | 'manual'>('lookup');
    const [editingStop, setEditingStop] = useState<ItineraryStop | null>(null);
    const [editingStopId, setEditingStopId] = useState<string | null>(null);
    const [editingStopNotes, setEditingStopNotes] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    
    const [locationSearch, setLocationSearch] = useState('');
    const [locationPredictions, setLocationPredictions] = useState<GooglePrediction[]>([]);
    const [showLocationPredictions, setShowLocationPredictions] = useState(false);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setShowLocationPredictions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchLocations = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setLocationPredictions([]);
            return;
        }
        setIsSearchingLocation(true);
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
                setLocationPredictions(predictions);
                setShowLocationPredictions(true);
            }
        } catch (error) {
            console.error('Location search error:', error);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const fetchPlaceDetails = async (placeId: string) => {
        try {
            const response = await fetch(`/api/places-new/${placeId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.location) {
                return {
                    lat: data.location.latitude,
                    lng: data.location.longitude,
                    address: data.formattedAddress || data.shortFormattedAddress || ''
                };
            }
        } catch (error) {
            console.error('Place details error:', error);
        }
        return null;
    };

    const handleLocationSearchChange = (value: string) => {
        setLocationSearch(value);
        setTempStop({ ...tempStop, name: value, placeId: '', googlePlaceId: '' });
        
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        
        if (value.length >= 2) {
            searchTimerRef.current = setTimeout(() => searchLocations(value), 300);
        } else {
            setLocationPredictions([]);
        }
    };

    const selectLocation = async (locationName: string, placeId?: string) => {
        let details = null;
        if (placeId) {
            details = await fetchPlaceDetails(placeId);
        }
        
        setTempStop({ 
            ...tempStop, 
            name: locationName, 
            googlePlaceId: placeId || '',
            placeId: '',
            address: details?.address || '',
            lat: details?.lat,
            lng: details?.lng
        });
        setLocationSearch(locationName);
        setShowLocationPredictions(false);
        setLocationPredictions([]);
    };
    
    const selectSavedPlace = (place: Place) => {
        setTempStop({ 
            ...tempStop, 
            placeId: place.id, 
            name: place.name,
            address: place.address || '',
            lat: place.lat,
            lng: place.lng
        });
        setLocationSearch(place.name);
        setShowLocationPredictions(false);
        setLocationPredictions([]);
    };

    const isDateInRange = (date: string, start: string, end: string): boolean => {
        if (!start || !end || !date) return true;
        const d = new Date(date);
        const s = new Date(start);
        const e = new Date(end);
        return d >= s && d <= e;
    };

    const getDateValidationError = (): string | null => {
        if (!tempStop.date || !formData.start || !formData.end) return null;
        if (!isDateInRange(tempStop.date, formData.start, formData.end)) {
            return `Date must be between ${new Date(formData.start).toLocaleDateString()} and ${new Date(formData.end).toLocaleDateString()}`;
        }
        return null;
    };

    const handlePhotoUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setIsUploadingPhoto(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                if (!file.type.startsWith('image/')) {
                    console.warn('Skipping non-image file:', file.name);
                    return null;
                }
                const url = await uploadPhoto(file, `itinerary-stops/${user?.uid || 'anonymous'}`);
                return url;
            });
            
            const urls = await Promise.all(uploadPromises);
            const validUrls = urls.filter((url): url is string => url !== null);
            
            setTempStop(prev => ({
                ...prev,
                photos: [...prev.photos, ...validUrls]
            }));
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Failed to upload photo. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) {
                photoInputRef.current.value = '';
            }
        }
    };

    const getSortKey = (stop: ItineraryStop): string => {
        if (stop.timeMode === 'bucket' && stop.timeBucket) {
            const bucket = TIME_BUCKETS.find(b => b.id === stop.timeBucket);
            return bucket?.sortKey || '12:00';
        }
        return stop.time || '23:59';
    };

    const sortStops = (stopsToSort: ItineraryStop[]): ItineraryStop[] => {
        return [...stopsToSort].sort((a, b) => {
            const dateA = a.date || '9999-12-31';
            const dateB = b.date || '9999-12-31';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            
            const sortKeyA = getSortKey(a);
            const sortKeyB = getSortKey(b);
            if (sortKeyA !== sortKeyB) return sortKeyA.localeCompare(sortKeyB);
            
            return (a.manualOrder || 0) - (b.manualOrder || 0);
        });
    };

    const handleAddStop = () => {
        if (!tempStop.name && !tempStop.placeId) return;
        
        const dateError = getDateValidationError();
        if (dateError) {
            alert(dateError);
            return;
        }
        
        let stopName = tempStop.name;
        if (tempStop.placeId) {
            const place = places.find(p => p.id === tempStop.placeId);
            if (place) stopName = place.name;
        }

        const source: StopSource = tempStop.placeId ? 'saved' : tempStop.googlePlaceId ? 'places' : 'manual';

        if (editingStop) {
            // Update existing stop
            const updatedStop: ItineraryStop = {
                ...editingStop,
                placeId: tempStop.placeId || undefined,
                googlePlaceId: tempStop.googlePlaceId || undefined,
                name: stopName,
                address: tempStop.address,
                placeType: tempStop.placeType,
                date: tempStop.date,
                time: tempStop.timeMode === 'fixed' ? tempStop.time : undefined,
                timeMode: tempStop.timeMode,
                timeBucket: tempStop.timeMode === 'bucket' ? tempStop.timeBucket as TimeBucket : undefined,
                sortKey: tempStop.timeMode === 'bucket' 
                    ? TIME_BUCKETS.find(b => b.id === tempStop.timeBucket)?.sortKey 
                    : tempStop.time,
                notes: tempStop.notes,
                lat: tempStop.lat,
                lng: tempStop.lng,
                source
            };
            
            const updated = sortStops(stops.map(s => s.id === editingStop.id ? updatedStop : s));
            setStops(updated);
            setEditingStop(null);
        } else {
            // Add new stop
            const newStop: ItineraryStop = {
                id: `stop-${Date.now()}`,
                isManual: !tempStop.placeId && !tempStop.googlePlaceId,
                placeId: tempStop.placeId || undefined,
                googlePlaceId: tempStop.googlePlaceId || undefined,
                name: stopName,
                address: tempStop.address,
                placeType: tempStop.placeType,
                date: tempStop.date,
                time: tempStop.timeMode === 'fixed' ? tempStop.time : undefined,
                timeMode: tempStop.timeMode,
                timeBucket: tempStop.timeMode === 'bucket' ? tempStop.timeBucket as TimeBucket : undefined,
                sortKey: tempStop.timeMode === 'bucket' 
                    ? TIME_BUCKETS.find(b => b.id === tempStop.timeBucket)?.sortKey 
                    : tempStop.time,
                notes: tempStop.notes,
                photos: tempStop.photos.length > 0 ? tempStop.photos : undefined,
                completed: false,
                lat: tempStop.lat,
                lng: tempStop.lng,
                source
            };
            
            const updated = sortStops([...stops, newStop]);
            setStops(updated);
        }
        
        setTempStop({ 
            placeId: '', googlePlaceId: '', name: '', address: '', date: '', time: '', 
            timeMode: 'fixed', timeBucket: '', notes: '', placeType: 'Other', photos: []
        });
        setLocationSearch('');
        setLocationPredictions([]);
        setShowLocationPredictions(false);
    };

    const handleCompleteVisit = async (itinerary: Itinerary, stopId: string) => {
        const stop = itinerary.stops?.find(s => s.id === stopId);
        if (!stop) return;

        const journalEntryId = `journal-${Date.now()}`;
        const journalEntry: Omit<JournalEntry, 'id'> = {
            title: `Visited: ${stop.name}`,
            body: `Completed visit to ${stop.name}${stop.notes ? `\n\nNotes: ${stop.notes}` : ''}\n\nPart of itinerary: ${itinerary.name}`,
            mood: 'Happy' as any,
            date: stop.date || new Date().toISOString().split('T')[0],
            location: stop.name,
            tags: ['travel', itinerary.name.toLowerCase().replace(/\s+/g, '-')]
        };

        await addJournalEntry(journalEntry as any);

        const newStops = itinerary.stops?.map(s => 
            s.id === stopId ? { ...s, completed: true, completedAt: new Date().toISOString(), journalEntryId } : s
        );
        await updateItinerary(itinerary.id, { stops: newStops });
    };

    const groupStopsByDay = (stops: ItineraryStop[]) => {
        const groups: { [date: string]: ItineraryStop[] } = {};
        
        stops.forEach(stop => {
            const date = stop.date || 'Unscheduled';
            if (!groups[date]) groups[date] = [];
            groups[date].push(stop);
        });
        
        Object.keys(groups).forEach(date => {
            groups[date] = sortStops(groups[date]);
        });
        
        return groups;
    };

    const handleExportPDF = async (itinerary: Itinerary) => {
        await generateItineraryPDF(itinerary);
    };

    const handleTogglePublicShare = async (itinerary: Itinerary) => {
        if (itinerary.isPublic && itinerary.publicShareToken) {
            try {
                await deleteDoc(doc(db, 'publicItineraries', itinerary.publicShareToken));
            } catch (err) {
                console.error('Failed to delete public copy:', err);
            }
            await updateItinerary(itinerary.id, { isPublic: false, publicShareToken: undefined });
        } else {
            const token = generateShareToken();
            const publicCopy = {
                ...itinerary,
                id: token,
                isPublic: true,
                publicShareToken: token,
                sourceItineraryId: itinerary.id,
                sharedAt: new Date().toISOString()
            };
            try {
                await setDoc(doc(db, 'publicItineraries', token), publicCopy);
            } catch (err) {
                console.error('Failed to create public copy:', err);
                return;
            }
            await updateItinerary(itinerary.id, { isPublic: true, publicShareToken: token });
        }
    };

    const handleCopyShareLink = async (itinerary: Itinerary) => {
        if (!itinerary.publicShareToken) return;
        const shareUrl = `${window.location.origin}/share/${itinerary.publicShareToken}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return;
        
        const hasScheduledDates = formData.start && formData.end;
        const autoStatus = hasScheduledDates ? 'Planned' : 'Planned';
        
        if (editingItinerary) {
            await updateItinerary(editingItinerary.id, {
                name: formData.name,
                startDate: formData.start,
                endDate: formData.end,
                notes: formData.notes,
                theme: formData.theme,
                stops
            });
        } else {
            await addItinerary({
                name: formData.name,
                startDate: formData.start,
                endDate: formData.end,
                notes: formData.notes,
                status: autoStatus,
                theme: formData.theme,
                stops
            });
        }
        
        setIsModalOpen(false);
        setEditingItinerary(null);
        setEditingStop(null);
        setFormData({ name: '', start: '', end: '', notes: '', theme: 'default' });
        setStops([]);
    };

    const handleEdit = (itinerary: Itinerary) => {
        setEditingItinerary(itinerary);
        setFormData({
            name: itinerary.name,
            start: itinerary.startDate || '',
            end: itinerary.endDate || '',
            notes: itinerary.notes || '',
            theme: itinerary.theme || 'default'
        });
        setStops(itinerary.stops || []);
        setLocationSearch('');
        setLocationPredictions([]);
        setShowLocationPredictions(false);
        setIsModalOpen(true);
    };

    const handleMoveStop = (index: number, direction: 'up' | 'down') => {
        const newStops = [...stops];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newStops.length) return;
        
        const currentStop = newStops[index];
        const targetStop = newStops[targetIndex];
        
        if (currentStop.date && targetStop.date && currentStop.date === targetStop.date) {
            const currentSortKey = getSortKey(currentStop);
            const targetSortKey = getSortKey(targetStop);
            
            if (direction === 'up' && currentSortKey < targetSortKey) {
                alert('Cannot move a stop before one with a later time slot on the same day');
                return;
            }
            if (direction === 'down' && currentSortKey > targetSortKey) {
                alert('Cannot move a stop after one with an earlier time slot on the same day');
                return;
            }
        }
        
        [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
        newStops[index].manualOrder = index;
        newStops[targetIndex].manualOrder = targetIndex;
        setStops(newStops);
    };

    const handleUpdateStopNotes = async (itineraryId: string, stopId: string, notes: string) => {
        const itinerary = itineraries.find(i => i.id === itineraryId);
        if (!itinerary) return;
        const newStops = itinerary.stops?.map(s => 
            s.id === stopId ? { ...s, notes } : s
        );
        await updateItinerary(itineraryId, { stops: newStops });
        setEditingStopId(null);
        setEditingStopNotes('');
    };

    const handleToggleStop = async (itinerary: Itinerary, stopId: string) => {
        const newStops = itinerary.stops?.map(s => 
            s.id === stopId ? { ...s, completed: !s.completed } : s
        );
        await updateItinerary(itinerary.id, { stops: newStops });
    };

    const handleEditStopFromView = (itinerary: Itinerary, stop: ItineraryStop) => {
        setEditingItinerary(itinerary);
        setFormData({
            name: itinerary.name,
            start: itinerary.startDate || '',
            end: itinerary.endDate || '',
            notes: itinerary.notes || '',
            theme: itinerary.theme || 'default'
        });
        setStops(itinerary.stops || []);
        setEditingStop(stop);
        setTempStop({
            placeId: stop.placeId || '',
            googlePlaceId: stop.googlePlaceId || '',
            name: stop.name,
            address: stop.address || '',
            date: stop.date || '',
            time: stop.time || '',
            timeMode: stop.timeMode || 'fixed',
            timeBucket: stop.timeBucket || '',
            notes: stop.notes || '',
            placeType: stop.placeType || 'Other',
            photos: []
        });
        setIsModalOpen(true);
    };

    const handleUpdateStatus = async (itinerary: Itinerary, newStatus: Itinerary['status']) => {
        const oldStatus = itinerary.status;
        
        if (newStatus === 'Completed' && oldStatus !== 'Completed') {
            if (!confirm(`Mark "${itinerary.name}" as completed? You can change this later.`)) return;
        }
        
        if (oldStatus === 'Completed' && newStatus !== 'Completed') {
            if (!confirm(`Reopen "${itinerary.name}"? This will change its status back to ${newStatus}.`)) return;
        }
        
        await updateItinerary(itinerary.id, { status: newStatus });
    };

    const toggleDayCollapse = (date: string) => {
        setCollapsedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const filteredItineraries = filteredBySharingItineraries.filter(i => 
        filterStatus === 'All' || i.status === filterStatus
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'warning';
            default: return 'info';
        }
    };

    const getDaysUntil = (date: string) => {
        const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const themeGradients: Record<string, string> = {
        default: 'from-cyan-500 to-blue-500',
        tropical: 'from-emerald-400 to-teal-500',
        adventure: 'from-orange-500 to-red-500',
        city: 'from-slate-500 to-gray-600',
        beach: 'from-cyan-400 to-blue-400',
        mountain: 'from-emerald-600 to-green-700'
    };

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="itineraries" 
                actions={
                    <Button 
                        onClick={() => {
                            setEditingItinerary(null);
                            setFormData({ name: '', start: '', end: '', notes: '', theme: 'default' });
                            setStops([]);
                            setLocationSearch('');
                            setLocationPredictions([]);
                            setShowLocationPredictions(false);
                            setCollapsedDays(new Set());
                            setIsModalOpen(true);
                        }} 
                        variant="primary"
                        icon={Plus}
                        size="md"
                    >
                        New Trip
                    </Button>
                }
            />

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            <Card padding="sm" className="backdrop-blur-sm bg-white/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <Tabs
                        tabs={[
                            { id: 'All', label: 'All Itineraries', count: itineraries.length },
                            { id: 'Planned', label: 'Planned' },
                            { id: 'In Progress', label: 'Active' },
                            { id: 'Completed', label: 'Completed' }
                        ]}
                        activeTab={filterStatus}
                        onChange={(id) => setFilterStatus(id as any)}
                    />
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button
                            onClick={() => setViewMode('full')}
                            className={`px-4 py-2 text-sm flex items-center gap-1.5 transition-all ${viewMode === 'full' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Cards View"
                        >
                            <LayoutGrid size={14} /> Cards
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-4 py-2 text-sm flex items-center gap-1.5 transition-all ${viewMode === 'compact' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Table View"
                        >
                            <List size={14} /> Table
                        </button>
                    </div>
                </div>
            </Card>

            {filteredItineraries.length === 0 ? (
                <Card className="backdrop-blur-sm bg-white/80 p-8">
                    <div className="text-center max-w-md mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Plane size={36} className="text-cyan-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No itineraries yet</h3>
                        <p className="text-gray-500 mb-6">Start planning your next adventure</p>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                            <h4 className="font-semibold text-gray-700 text-sm mb-3">How to create an itinerary:</h4>
                            <ol className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                    <span>Click "New Itinerary" and give your itinerary a name</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                    <span>Set dates (optional) or leave blank for flexible planning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                    <span>Search for places or enter locations manually</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                                    <span>Add stops with dates and times, then save</span>
                                </li>
                            </ol>
                        </div>
                        
                        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
                            Create Your First Itinerary
                        </Button>
                    </div>
                </Card>
            ) : viewMode === 'compact' ? (
                <Card padding="none" className="overflow-hidden backdrop-blur-sm bg-white/90 shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Itinerary</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Dates</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Stops</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItineraries.map(itinerary => {
                                    const completedStops = itinerary.stops?.filter(s => s.completed).length || 0;
                                    const totalStops = itinerary.stops?.length || 0;
                                    const themeGradient = themeGradients[itinerary.theme || 'default'];
                                    return (
                                        <tr key={itinerary.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === itinerary.id ? null : itinerary.id)}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${themeGradient} flex items-center justify-center text-white shadow`}>
                                                        <Plane size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{itinerary.name}</div>
                                                        {itinerary.isPublic && (
                                                            <span className="text-xs text-blue-600 flex items-center gap-1"><Globe size={10} /> Public</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                                                {itinerary.startDate && itinerary.endDate ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {new Date(itinerary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(itinerary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No dates</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="font-medium text-gray-700">{completedStops}/{totalStops}</span>
                                                    {totalStops > 0 && (
                                                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className={`h-full bg-gradient-to-r ${themeGradient}`} style={{ width: `${(completedStops / totalStops) * 100}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={getStatusColor(itinerary.status) as any} size="sm">{itinerary.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(itinerary); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleExportPDF(itinerary); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Export PDF">
                                                        <Download size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this itinerary?')) removeItinerary(itinerary.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedId === itinerary.id ? 'rotate-90' : ''}`} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredItineraries.map(itinerary => {
                        const isExpanded = expandedId === itinerary.id;
                        const completedStops = itinerary.stops?.filter(s => s.completed).length || 0;
                        const totalStops = itinerary.stops?.length || 0;
                        const daysUntil = getDaysUntil(itinerary.startDate || '');
                        const themeGradient = themeGradients[itinerary.theme || 'default'];
                        const groupedStops = groupStopsByDay(itinerary.stops || []);
                        const sortedDates = Object.keys(groupedStops).sort((a, b) => 
                            a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()
                        );

                        return (
                            <Card key={itinerary.id} hover padding="none" className="overflow-hidden backdrop-blur-sm bg-white/90">
                                <div 
                                    className="px-4 py-3 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : itinerary.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeGradient} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                                            <Plane size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-gray-900 text-base truncate">{itinerary.name}</h3>
                                                <Badge variant={getStatusColor(itinerary.status) as any} size="xs">
                                                    {itinerary.status}
                                                </Badge>
                                                {itinerary.isPublic && (
                                                    <Badge variant="info" size="xs" className="flex items-center gap-0.5">
                                                        <Globe size={8} /> Public
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {itinerary.startDate && itinerary.endDate ? (
                                                        `${new Date(itinerary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(itinerary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                    ) : 'No dates'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={11} />
                                                    {totalStops} stops
                                                </span>
                                                {daysUntil > 0 && itinerary.status === 'Planned' && (
                                                    <span className="text-blue-600 font-medium">{daysUntil}d away</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShareItinerary(itinerary); setShareModalOpen(true); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Share"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleExportPDF(itinerary); }}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Export PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(itinerary); }}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (confirm('Delete this itinerary?')) removeItinerary(itinerary.id); 
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <div className={`p-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {totalStops > 0 && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full bg-gradient-to-r ${themeGradient} transition-all duration-500`}
                                                    style={{ width: `${(completedStops / totalStops) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">{completedStops}/{totalStops}</span>
                                        </div>
                                    )}
                                </div>

                                {isExpanded && itinerary.stops && itinerary.stops.length > 0 && (
                                    <div className="border-t border-gray-100 p-5 bg-gradient-to-b from-gray-50/50 to-white animate-enter">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                                                <Route size={16} className="text-blue-500" />
                                                Itinerary
                                            </h4>
                                            <Select
                                                options={[
                                                    { value: 'Planned', label: 'Planned' },
                                                    { value: 'Active', label: 'Active' },
                                                    { value: 'Completed', label: 'Completed' }
                                                ]}
                                                value={itinerary.status}
                                                onChange={(v) => handleUpdateStatus(itinerary, v as any)}
                                                fullWidth={false}
                                                className="w-36"
                                            />
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {sortedDates.map((date, dayIndex) => (
                                                <CollapsibleDaySection
                                                    key={date}
                                                    date={date}
                                                    stops={groupedStops[date]}
                                                    isCollapsed={collapsedDays.has(date)}
                                                    onToggle={() => toggleDayCollapse(date)}
                                                    onToggleStop={(stopId) => handleToggleStop(itinerary, stopId)}
                                                    onCompleteVisit={(stopId) => handleCompleteVisit(itinerary, stopId)}
                                                    onEditNotes={(stopId, notes) => handleUpdateStopNotes(itinerary.id, stopId, notes)}
                                                    onEditStop={(stop) => handleEditStopFromView(itinerary, stop)}
                                                    itineraryId={itinerary.id}
                                                    dayNumber={dayIndex + 1}
                                                    totalDays={sortedDates.length}
                                                />
                                            ))}
                                        </div>
                                        
                                        {itinerary.notes && (
                                            <div className="mt-4 p-4 bg-blue-50/80 rounded-xl border border-blue-100">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-1.5">
                                                    <FileText size={12} /> Itinerary Notes
                                                </div>
                                                <p className="text-sm text-blue-800">{itinerary.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal 
                isOpen={shareModalOpen} 
                onClose={() => { setShareModalOpen(false); setShareItinerary(null); }} 
                title="Share Itinerary"
                size="sm"
            >
                {shareItinerary && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeGradients[shareItinerary.theme || 'default']} flex items-center justify-center text-white`}>
                                    <Plane size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{shareItinerary.name}</h4>
                                    <p className="text-xs text-gray-500">{shareItinerary.stops?.length || 0} stops</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${shareItinerary.isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {shareItinerary.isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-gray-900">Public Link</h5>
                                        <p className="text-xs text-gray-500">Anyone with the link can view</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTogglePublicShare(shareItinerary)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${shareItinerary.isPublic ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-sm ${shareItinerary.isPublic ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                            
                            {shareItinerary.isPublic && shareItinerary.publicShareToken && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link size={14} className="text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">Share Link</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${window.location.origin}/share/${shareItinerary.id}?token=${shareItinerary.publicShareToken}`}
                                            className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-gray-600"
                                        />
                                        <button
                                            onClick={() => handleCopyShareLink(shareItinerary)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                copySuccess 
                                                    ? 'bg-green-500 text-white' 
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-3 border-t">
                            <Button variant="secondary" fullWidth onClick={() => { setShareModalOpen(false); setShareItinerary(null); }}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItinerary(null);
                }} 
                title={editingItinerary ? 'Edit Itinerary' : 'Plan New Itinerary'}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[60vh]">
                    <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-0 lg:self-start">
                        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 border border-cyan-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                    <Plane size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Itinerary Details</h3>
                                    <p className="text-xs text-gray-500">Basic itinerary information</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Itinerary Name"
                                    placeholder="e.g., Summer Vacation 2024"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Start Date"
                                        type="date"
                                        value={formData.start}
                                        onChange={(e) => setFormData({...formData, start: e.target.value})}
                                    />
                                    <Input
                                        label="End Date"
                                        type="date"
                                        value={formData.end}
                                        onChange={(e) => setFormData({...formData, end: e.target.value})}
                                    />
                                </div>

                                <Textarea
                                    label="Itinerary Notes"
                                    placeholder="Add any general notes about this itinerary..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    rows={3}
                                />
                            </div>
                        </div>

                        {(formData.start && formData.end) && (
                            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Itinerary Summary</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
                                        <div className="text-3xl font-bold text-blue-600">
                                            {Math.ceil((new Date(formData.end).getTime() - new Date(formData.start).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                                        </div>
                                        <div className="text-xs text-blue-500 font-medium">Days</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 text-center">
                                        <div className="text-3xl font-bold text-cyan-600">{stops.length}</div>
                                        <div className="text-xs text-cyan-500 font-medium">Stops</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => { setIsModalOpen(false); setEditingStop(null); }}>
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handleSave}
                                disabled={!formData.name}
                            >
                                {editingItinerary ? 'Save Changes' : 'Create Itinerary'}
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-5">
                        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                        <MapPin size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">Add Stops</h3>
                                        <p className="text-xs text-gray-500">Build your itinerary</p>
                                    </div>
                                </div>
                                
                                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => setEntryMode('lookup')}
                                        className={`px-3 py-1.5 text-sm flex items-center gap-1 ${entryMode === 'lookup' ? 'bg-purple-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Search size={14} /> Lookup
                                    </button>
                                    <button
                                        onClick={() => setEntryMode('manual')}
                                        className={`px-3 py-1.5 text-sm flex items-center gap-1 ${entryMode === 'manual' ? 'bg-purple-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Edit2 size={14} /> Manual
                                    </button>
                                </div>
                            </div>

                            {getDateValidationError() && (
                                <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                                    <X size={14} />
                                    {getDateValidationError()}
                                </div>
                            )}

                            {entryMode === 'lookup' ? (
                                <div className="relative mb-4" ref={locationDropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm transition-all"
                                            placeholder="Search for a location or select from saved places..."
                                            value={locationSearch || tempStop.name || ''}
                                            onChange={(e) => handleLocationSearchChange(e.target.value)}
                                            onFocus={() => setShowLocationPredictions(true)}
                                        />
                                        {isSearchingLocation && (
                                            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                        )}
                                    </div>
                                    
                                    {showLocationPredictions && (places.length > 0 || locationPredictions.length > 0 || locationSearch.trim()) && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                                            {places.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-xs font-bold text-amber-700 flex items-center gap-2 sticky top-0 border-b border-amber-100">
                                                        <Star size={12} /> Saved Places
                                                    </div>
                                                    {places.slice(0, 5).map(place => (
                                                        <button
                                                            key={place.id}
                                                            type="button"
                                                            onClick={() => selectSavedPlace(place)}
                                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-b border-gray-50"
                                                        >
                                                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                                                <MapPin size={14} className="text-amber-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-gray-900 truncate">{place.name}</div>
                                                                <div className="text-xs text-gray-500 truncate">{place.address || place.city}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            
                                            {locationPredictions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-xs font-bold text-blue-700 flex items-center gap-2 sticky top-0 border-b border-blue-100">
                                                        <Globe size={12} /> Google Places
                                                    </div>
                                                    {locationPredictions.map(prediction => (
                                                        <button
                                                            key={prediction.place_id}
                                                            type="button"
                                                            onClick={() => selectLocation(prediction.structured_formatting?.main_text || prediction.description, prediction.place_id)}
                                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-b border-gray-50"
                                                        >
                                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                <Globe size={14} className="text-blue-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-gray-900 truncate">
                                                                    {prediction.structured_formatting?.main_text || prediction.description}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {prediction.structured_formatting?.secondary_text}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                            
                                            {locationSearch.trim() && (
                                                <button
                                                    type="button"
                                                    onClick={() => selectLocation(locationSearch)}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-t"
                                                >
                                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <Plus size={14} className="text-green-600" />
                                                    </div>
                                                    <span className="text-gray-700">Use "<span className="font-semibold">{locationSearch}</span>" as custom location</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Stop Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm transition-all"
                                            placeholder="Enter a custom name for this stop..."
                                            value={tempStop.name || ''}
                                            onChange={(e) => setTempStop({...tempStop, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="relative" ref={locationDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Google Places <span className="text-gray-400 font-normal">(optional)</span></label>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm transition-all"
                                                placeholder="Search to auto-fill address & coordinates..."
                                                value={locationSearch}
                                                onChange={(e) => {
                                                    setLocationSearch(e.target.value);
                                                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                                                    if (e.target.value.length >= 2) {
                                                        searchTimerRef.current = setTimeout(() => searchLocations(e.target.value), 300);
                                                    } else {
                                                        setLocationPredictions([]);
                                                    }
                                                }}
                                                onFocus={() => setShowLocationPredictions(true)}
                                            />
                                            {isSearchingLocation ? (
                                                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                            ) : null}
                                        </div>
                                        
                                        {showLocationPredictions && locationPredictions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-xs font-bold text-blue-700 flex items-center gap-2 sticky top-0 border-b border-blue-100">
                                                    <Globe size={12} /> Google Places - Click to use address
                                                </div>
                                                {locationPredictions.map(prediction => (
                                                    <button
                                                        key={prediction.place_id}
                                                        type="button"
                                                        onClick={async () => {
                                                            const details = await fetchPlaceDetails(prediction.place_id);
                                                            setTempStop({
                                                                ...tempStop, 
                                                                name: tempStop.name || prediction.structured_formatting?.main_text || prediction.description,
                                                                address: details?.address || prediction.structured_formatting?.secondary_text || '',
                                                                googlePlaceId: prediction.place_id,
                                                                lat: details?.lat,
                                                                lng: details?.lng
                                                            });
                                                            setLocationSearch('');
                                                            setShowLocationPredictions(false);
                                                            setLocationPredictions([]);
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-b border-gray-50"
                                                    >
                                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <Globe size={14} className="text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-gray-900 truncate">
                                                                {prediction.structured_formatting?.main_text || prediction.description}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">
                                                                {prediction.structured_formatting?.secondary_text}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        label="Address (optional)"
                                        placeholder="Enter address..."
                                        value={tempStop.address}
                                        onChange={(e) => setTempStop({...tempStop, address: e.target.value})}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                <Select
                                    label="Type"
                                    options={STOP_PLACE_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                    value={tempStop.placeType}
                                    onChange={(v) => setTempStop({...tempStop, placeType: v as StopPlaceType})}
                                />
                                <Input
                                    label="Date"
                                    type="date"
                                    value={tempStop.date}
                                    onChange={(e) => setTempStop({...tempStop, date: e.target.value})}
                                    min={formData.start}
                                    max={formData.end}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            {tempStop.timeMode === 'fixed' ? (
                                                <input
                                                    type="time"
                                                    value={tempStop.time}
                                                    onChange={(e) => setTempStop({...tempStop, time: e.target.value})}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                />
                                            ) : (
                                                <select
                                                    value={tempStop.timeBucket}
                                                    onChange={(e) => setTempStop({...tempStop, timeBucket: e.target.value as TimeBucket})}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white cursor-pointer min-w-[160px]"
                                                >
                                                    <option value="">Select time...</option>
                                                    {TIME_BUCKETS.map(b => (
                                                        <option key={b.id} value={b.id}>{b.label} ({b.range})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setTempStop({
                                                ...tempStop, 
                                                timeMode: tempStop.timeMode === 'fixed' ? 'bucket' : 'fixed',
                                                time: '',
                                                timeBucket: ''
                                            })}
                                            className={`p-2.5 rounded-xl border transition-all ${
                                                tempStop.timeMode === 'bucket' 
                                                    ? 'bg-amber-50 border-amber-200 text-amber-600' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title={tempStop.timeMode === 'fixed' ? 'Switch to flexible time' : 'Switch to exact time'}
                                        >
                                            <Sun size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Input
                                label="Stop Notes (optional)"
                                placeholder="Any special notes for this stop..."
                                value={tempStop.notes}
                                onChange={(e) => setTempStop({...tempStop, notes: e.target.value})}
                            />

                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Photos (optional)</label>
                                <div className="flex flex-wrap gap-2">
                                    {tempStop.photos.map((url, i) => (
                                        <div key={i} className="relative group">
                                            <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                            <button 
                                                onClick={() => setTempStop({...tempStop, photos: tempStop.photos.filter((_, idx) => idx !== i)})}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handlePhotoUpload(e.target.files)}
                                        className="hidden"
                                    />
                                    <button 
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isUploadingPhoto}
                                        className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors text-xs gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUploadingPhoto ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                Add
                                            </>
                                        )}
                                    </button>
                                </div>
                                {tempStop.photos.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">{tempStop.photos.length} photo{tempStop.photos.length !== 1 ? 's' : ''} added</p>
                                )}
                            </div>

                            <div className="mt-4">
                                <Button 
                                    variant="primary" 
                                    fullWidth 
                                    onClick={handleAddStop} 
                                    disabled={!!getDateValidationError() || (!tempStop.name && !tempStop.placeId)}
                                    icon={editingStop ? CheckCircle : Plus}
                                >
                                    {editingStop ? 'Update Stop' : 'Add Stop to Itinerary'}
                                </Button>
                                {editingStop && (
                                    <Button 
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setEditingStop(null);
                                            setTempStop({ 
                                                placeId: '', googlePlaceId: '', name: '', address: '', date: '', time: '', 
                                                timeMode: 'fixed', timeBucket: '', notes: '', placeType: 'Other', photos: []
                                            });
                                        }}
                                    >
                                        Cancel Edit
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Route size={18} className="text-blue-500" />
                                        Planned Stops
                                    </h4>
                                    <Badge variant="info" size="sm">{stops.length} stops</Badge>
                                </div>
                            </div>

                            {stops.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <MapPin size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">No stops added yet</p>
                                    <p className="text-gray-400 text-xs mt-1">Search or enter locations above to add stops</p>
                                </div>
                            ) : (
                                <div className="max-h-[350px] overflow-y-auto">
                                    {(() => {
                                        const grouped: { [date: string]: ItineraryStop[] } = {};
                                        stops.forEach(stop => {
                                            const key = stop.date || 'Unscheduled';
                                            if (!grouped[key]) grouped[key] = [];
                                            grouped[key].push(stop);
                                        });
                                        const sortedDates = Object.keys(grouped).sort((a, b) => {
                                            if (a === 'Unscheduled') return 1;
                                            if (b === 'Unscheduled') return -1;
                                            return a.localeCompare(b);
                                        });
                                        
                                        return sortedDates.map((date, dayIdx) => (
                                            <div key={date} className={dayIdx > 0 ? 'border-t border-gray-100' : ''}>
                                                <div className="px-4 py-2 bg-gray-50/80 sticky top-0">
                                                    <span className="text-xs font-semibold text-gray-600">
                                                        {date === 'Unscheduled' ? 'Unscheduled' : 
                                                            new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <Badge variant="default" size="xs" className="ml-2">{grouped[date].length}</Badge>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {grouped[date].map((stop, idx) => {
                                                        const globalIdx = stops.findIndex(s => s.id === stop.id);
                                                        const typeInfo = getPlaceTypeInfo(stop.placeType);
                                                        const TypeIcon = typeInfo.icon;
                                                        const timeSegment = getTimeSegment(stop.time || '', stop.timeBucket);
                                                        return (
                                                            <div key={stop.id} className="px-4 py-2 hover:bg-gray-50/50 transition-colors group flex items-center gap-3">
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleMoveStop(globalIdx, 'up')}
                                                                        disabled={globalIdx === 0}
                                                                        className={`p-1 rounded transition-colors ${globalIdx === 0 ? 'text-gray-200' : 'text-gray-300 hover:text-gray-500'}`}
                                                                    >
                                                                        <ArrowUp size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMoveStop(globalIdx, 'down')}
                                                                        disabled={globalIdx === stops.length - 1}
                                                                        className={`p-1 rounded transition-colors ${globalIdx === stops.length - 1 ? 'text-gray-200' : 'text-gray-300 hover:text-gray-500'}`}
                                                                    >
                                                                        <ArrowDown size={12} />
                                                                    </button>
                                                                </div>
                                                                
                                                                <span className="text-xs text-gray-400 w-5">#{globalIdx + 1}</span>
                                                                
                                                                <TypeIcon size={14} className={typeInfo.color} />
                                                                
                                                                <span className="font-medium text-sm text-gray-800 flex-1 truncate">{stop.name}</span>
                                                                
                                                                {(stop.time || stop.timeBucket) && (
                                                                    <span className={`text-xs ${timeSegment.color} flex items-center gap-1`}>
                                                                        <Clock size={10} />
                                                                        {stop.time || timeSegment.name}
                                                                    </span>
                                                                )}
                                                                
                                                                {stop.notes && (
                                                                    <MessageSquare size={12} className="text-gray-300" title={stop.notes} />
                                                                )}
                                                                
                                                                <button
                                                                    onClick={() => setStops(stops.filter((_, i) => i !== globalIdx))}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ItinerariesView;
