
import React, { useState, useMemo } from 'react';
import { Plus, MapPin, Globe, List, Eye, Edit2, ChevronDown, ChevronUp, CalendarPlus, CheckCircle, Navigation, Calendar, Route, Trash2, Compass, Loader2, Search, ExternalLink, Star, CheckSquare, Square, X, Building, Layers, MapPinned, ListPlus, Map as MapIcon, AlertCircle, RefreshCw, Phone, DollarSign, Clock } from 'lucide-react';
import { Place, PlaceType, JournalEntry, VisitRecord, PlaceEvent, ItineraryStop, Itinerary } from '../../types';
import SortableTable from '../../components/SortableTable';
import Modal from '../../components/Modal';
import PlaceForm from './PlaceForm';
import { useFirestore } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  lat: number;
  lng: number;
  icon?: string;
}

// ... (Existing Sub-components RecordVisitModal and PlaceDetailContent remain unchanged in implementation, just included implicitly or can be kept as is. The focus is on PlacesView rendering)

const RecordVisitModal = ({ place, onClose, onSave }: { place: Place, onClose: () => void, onSave: (visit: any) => void }) => {
    const [rating, setRating] = useState(place.rating || 5);
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [existingVisit, setExistingVisit] = useState<VisitRecord | null>(null);

    const visitHistory = place.visitHistory || [];

    // Check for duplicate date
    const checkForDuplicate = (selectedDate: string) => {
        const existing = visitHistory.find(v => v.date === selectedDate);
        if (existing) {
            setExistingVisit(existing);
            setShowDuplicateWarning(true);
        } else {
            setExistingVisit(null);
            setShowDuplicateWarning(false);
        }
    };

    // Check for duplicate on initial mount with today's date
    React.useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        checkForDuplicate(today);
    }, []);

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        checkForDuplicate(newDate);
    };

    const handleAddMockPhoto = () => {
        const mockUrl = `https://source.unsplash.com/random/200x200?sig=${Date.now()}`;
        setPhotos([...photos, mockUrl]);
    };

    const handleSubmit = () => {
        onSave({ date, rating, notes, photos, isNewVisit: true });
    };

    const handleAddToExisting = () => {
        if (existingVisit) {
            onSave({ 
                date, 
                rating, 
                notes, 
                photos, 
                isNewVisit: false, 
                existingVisitId: existingVisit.id,
                existingNotes: existingVisit.notes
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={20} /></div>
                <div>
                    <h4 className="font-bold text-gray-900">Recording Visit to {place.name}</h4>
                    <p className="text-xs text-gray-500">This will update the place stats and create a journal entry.</p>
                </div>
            </div>

            {/* Visit History */}
            {visitHistory.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <h5 className="text-xs font-semibold text-blue-700 uppercase mb-2 flex items-center gap-1">
                        <Calendar size={12} /> Previous Visits ({visitHistory.length})
                    </h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {visitHistory.slice(0, 5).map((visit) => (
                            <div key={visit.id} className="flex items-center justify-between bg-white rounded px-2 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">{visit.date}</span>
                                    <span className="text-yellow-500">{'★'.repeat(visit.rating)}</span>
                                </div>
                                {visit.notes && (
                                    <span className="text-gray-400 truncate max-w-[150px]">{visit.notes}</span>
                                )}
                            </div>
                        ))}
                        {visitHistory.length > 5 && (
                            <p className="text-xs text-blue-500 text-center">+{visitHistory.length - 5} more visits</p>
                        )}
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">When did you visit?</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={e => handleDateChange(e.target.value)} 
                    className="w-full border rounded-md p-2 text-sm" 
                />
            </div>

            {/* Duplicate Warning */}
            {showDuplicateWarning && existingVisit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">You already visited on this date</p>
                            <p className="text-xs text-amber-600 mt-1">
                                Rating: {'★'.repeat(existingVisit.rating)} 
                                {existingVisit.notes && <span className="ml-2">Notes: "{existingVisit.notes.slice(0, 50)}{existingVisit.notes.length > 50 ? '...' : ''}"</span>}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button 
                                    onClick={handleAddToExisting}
                                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 font-medium"
                                >
                                    Add to existing notes
                                </button>
                                <button 
                                    onClick={() => setShowDuplicateWarning(false)}
                                    className="text-xs text-amber-600 hover:text-amber-800"
                                >
                                    Create new entry anyway
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate your experience</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setRating(star)} className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {showDuplicateWarning ? 'Additional Notes' : 'Reflections / Notes'}
                </label>
                <textarea 
                    className="w-full border rounded-md p-2 text-sm h-24" 
                    placeholder={showDuplicateWarning ? "Add more notes to this visit..." : "What did you eat? How was the vibe?"}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                ></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                <div className="flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                        <img key={i} src={url} alt="Visit" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                    ))}
                    <button onClick={handleAddMockPhoto} className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors text-xs flex-col gap-1">
                        <Plus size={14} /> Add
                    </button>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancel</button>
                {!showDuplicateWarning && (
                    <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Record Visit</button>
                )}
            </div>
        </div>
    );
};

const PlaceDetailContent = ({ place, onPlanVisit, onRecordVisit, onAddToItinerary, onRefreshData }: { place: Place, onPlanVisit: (event?: PlaceEvent) => void, onRecordVisit: () => void, onAddToItinerary?: () => void, onRefreshData?: () => void }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'history'>('details');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (onRefreshData) {
            setIsRefreshing(true);
            await onRefreshData();
            setIsRefreshing(false);
        }
    };

    const formatLastUpdated = (dateStr?: string) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            {/* Place Name - Same as Add Place form */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Place Name</label>
                <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{place.name}</span>
                    {place.isIncomplete && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Draft</span>
                    )}
                </div>
            </div>

            {/* Google Data Section - Similar to Google Details Preview in Add Place */}
            {place.googleMapsData?.placeId ? (
                <div className="bg-white rounded-lg border-2 border-green-300 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Google Data</span>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white/90 hover:text-white bg-white/20 rounded transition-colors"
                        >
                            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    
                    <div className="p-3 space-y-3">
                        {/* Main Info with Map */}
                        <div className="flex gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-600">{place.address}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{place.city}{place.state && `, ${place.state}`}{place.country && `, ${place.country}`}</p>
                                    </div>
                                </div>

                                {/* Rating & Price & Phone */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(place.googleMapsData?.rating || place.rating > 0) && (
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-xs font-medium text-amber-700">
                                            <Star className="w-3 h-3" fill="currentColor" /> {place.googleMapsData?.rating || place.rating}
                                            {place.googleMapsData?.totalRatings && <span className="text-amber-600">({place.googleMapsData.totalRatings})</span>}
                                        </div>
                                    )}
                                    {place.googleMapsData?.priceLevel && (
                                        <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-xs font-medium text-green-700">
                                            <DollarSign className="w-3 h-3" /> {'$'.repeat(place.googleMapsData.priceLevel)}
                                        </div>
                                    )}
                                    {place.googleMapsData?.phone && (
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs font-medium text-blue-700">
                                            <Phone className="w-3 h-3" /> {place.googleMapsData.phone}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Map Preview */}
                            <div className="w-32 h-24 rounded-lg overflow-hidden border border-gray-200 relative bg-gray-100 flex-shrink-0">
                                {place.lat && place.lng ? (
                                    <>
                                        <img
                                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${place.lat},${place.lng}&zoom=15&size=200x150&markers=color:red%7C${place.lat},${place.lng}&key=${(window as any).__GOOGLE_MAPS_API_KEY__ || ''}`}
                                            alt="Map"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                                        >
                                            <Navigation size={16} className="text-white drop-shadow-lg opacity-0 hover:opacity-100" />
                                        </a>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-300">
                                        <MapIcon className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Opening Hours */}
                        {place.googleMapsData?.openingHours && place.googleMapsData.openingHours.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-2">
                                <div className="flex items-center gap-1.5 text-gray-700 text-xs font-medium mb-1.5">
                                    <Clock size={10} /> Hours
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                                    {place.googleMapsData.openingHours.slice(0, 7).map((hour, i) => (
                                        <div key={i} className="truncate">{hour}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Website */}
                        {(place.website || place.googleMapsData?.website) && (
                            <a href={place.website || place.googleMapsData?.website} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700 text-xs flex items-center gap-1.5">
                                <Globe size={12} /> {(place.website || place.googleMapsData?.website || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                            </a>
                        )}

                        {/* Last Updated */}
                        <div className="text-[10px] text-gray-400 text-right">
                            Last updated: {formatLastUpdated(place.googleMapsData?.lastUpdated)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                    <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No Google data available</p>
                    <p className="text-xs text-gray-400 mt-1">Edit this place and search Google to add data</p>
                </div>
            )}

            {/* Type & Rating Row - Same as Add Place */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {place.type}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Rating</label>
                    <div className="flex gap-1 py-1.5">
                        {[1, 2, 3, 4, 5].map(star => (
                            <div
                                key={star}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    place.rating >= star ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-300'
                                }`}
                            >
                                <Star className="w-4 h-4" fill={place.rating >= star ? 'currentColor' : 'none'} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Location Section - Same as Add Place */}
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
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                            {place.address || 'Not specified'}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">City</label>
                            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                                {place.city || '-'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">State</label>
                            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                                {place.state || '-'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-0.5">Country</label>
                            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                                {place.country || '-'}
                            </div>
                        </div>
                    </div>
                    {place.lat && place.lng && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin size={12} />
                            <span>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</span>
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <ExternalLink size={12} /> Open in Maps
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs for Additional Info */}
            <div className="border-b border-gray-200 flex gap-6">
                {[
                    { id: 'details', label: 'Events & Notes' },
                    { id: 'photos', label: 'Photos' },
                    { id: 'history', label: 'Visit History' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[120px]">
                {activeTab === 'details' && (
                    <div className="space-y-4 animate-fade-in">
                        {place.events && place.events.length > 0 && (
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                                <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wide">
                                    <Calendar size={12} /> Events & Best Times
                                </div>
                                <div className="space-y-2">
                                    {place.events.map(event => (
                                        <div key={event.id} className="flex items-center justify-between bg-white p-2 rounded border border-purple-100 shadow-sm">
                                            <div>
                                                <div className="font-semibold text-gray-800 text-sm">{event.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {event.startDate} {event.endDate && event.endDate !== event.startDate ? `- ${event.endDate}` : ''}
                                                </div>
                                            </div>
                                            <button onClick={() => onPlanVisit(event)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center gap-1">
                                                <Route size={12} /> Plan
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                            <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 min-h-[60px] text-gray-700">
                                {place.notes || 'No notes added yet.'}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'photos' && (
                    <div className="grid grid-cols-3 gap-3 animate-fade-in">
                        {place.photos?.map((url, i) => (
                            <img key={i} src={url} className="w-full h-24 object-cover rounded-lg border border-gray-100 hover:opacity-90 cursor-pointer hover:scale-105 transition-transform" />
                        ))}
                        {(!place.photos || place.photos.length === 0) && (
                            <div className="col-span-3 py-10 text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">No photos yet. Record a visit to add some!</div>
                        )}
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">General Notes</h4>
                            <p className="text-sm text-gray-700">{place.notes || 'No general notes.'}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Visit Log</h4>
                            <div className="space-y-3">
                                {place.visitHistory?.map((visit) => (
                                    <div key={visit.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-gray-900 text-sm">{visit.date}</span>
                                            <span className="text-yellow-400 text-xs">{'★'.repeat(visit.rating)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{visit.notes}</p>
                                        {visit.photos && visit.photos.length > 0 && (
                                            <div className="flex gap-2">
                                                {visit.photos.map((p, i) => (
                                                    <img key={i} src={p} className="w-8 h-8 rounded object-cover border border-gray-200" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!place.visitHistory || place.visitHistory.length === 0) && (
                                    <div className="text-sm text-gray-400 italic">No visits recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Buttons */}
            <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={onRecordVisit} 
                        className="py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                        <CheckCircle size={20} />
                        <span>Visited</span>
                    </button>
                    <button 
                        onClick={() => onPlanVisit()} 
                        className="py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 font-medium text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                        <Route size={20} />
                        <span>Plan Trip</span>
                    </button>
                    {onAddToItinerary && (
                        <button 
                            onClick={onAddToItinerary} 
                            className="py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium text-sm flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors"
                        >
                            <ListPlus size={20} />
                            <span>Add to Itinerary</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const NEARBY_PLACE_TYPES = [
    { id: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { id: 'cafe', label: 'Cafes', icon: '☕' },
    { id: 'bar', label: 'Bars', icon: '🍺' },
    { id: 'tourist_attraction', label: 'Attractions', icon: '🏛️' },
    { id: 'museum', label: 'Museums', icon: '🖼️' },
    { id: 'park', label: 'Parks', icon: '🌳' },
    { id: 'shopping_mall', label: 'Shopping', icon: '🛍️' },
    { id: 'hotel', label: 'Hotels', icon: '🏨' },
];

const PlacesView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: places, add: addPlace, update: updatePlace } = useFirestore<Place>('places');
    const { add: addJournalEntry } = useFirestore<JournalEntry>('journal');
    const { data: itineraries, add: addItinerary, update: updateItinerary } = useFirestore<Itinerary>('itineraries');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('places'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: places.length,
            mine: places.filter(p => p.owner === userId).length,
            shared: places.filter(p => 
                p.owner !== userId && (p.isShared || p.sharedWith?.includes(userId))
            ).length,
            assigned: places.filter(p => 
                (p as any).assignedTo === userId && p.owner !== userId
            ).length
        };
    }, [places, user]);

    const filteredBySharingPlaces = useMemo(() => {
        return filterDataBySharing<Place>(
            places, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
    }, [places, user, sharingMode, isAdmin]);

    // View States
    const [groupBy, setGroupBy] = useState<'none' | 'type' | 'city' | 'drafts'>('none');
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
    
    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRecordVisitOpen, setIsRecordVisitOpen] = useState(false);
    const [isPlanTripOpen, setIsPlanTripOpen] = useState(false);
    const [isDiscoverNearbyOpen, setIsDiscoverNearbyOpen] = useState(false);
    const [isAddToItineraryOpen, setIsAddToItineraryOpen] = useState(false);
    
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    // Itinerary Prep State
    const [tripPrepData, setTripPrepData] = useState<{place: Place, event?: PlaceEvent} | null>(null);
    const [newTripName, setNewTripName] = useState('');
    const [newTripStart, setNewTripStart] = useState('');
    const [newTripEnd, setNewTripEnd] = useState('');

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
    const [isCreateTripFromSelectionOpen, setIsCreateTripFromSelectionOpen] = useState(false);

    const togglePlaceSelection = (placeId: string) => {
        setSelectedPlaceIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(placeId)) {
                newSet.delete(placeId);
            } else {
                newSet.add(placeId);
            }
            return newSet;
        });
    };

    const clearSelection = () => {
        setSelectedPlaceIds(new Set());
        setIsSelectionMode(false);
    };

    // Discover Nearby State
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
    const [isDiscoveringNearby, setIsDiscoveringNearby] = useState(false);
    const [nearbyError, setNearbyError] = useState<string | null>(null);
    const [nearbyType, setNearbyType] = useState('restaurant');
    const [nearbyRadius, setNearbyRadius] = useState(1500);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const filteredPlaces = filteredBySharingPlaces;

    const selectAllPlaces = () => {
        setSelectedPlaceIds(new Set(filteredPlaces.map(p => p.id)));
    };

    // Use full places array to ensure selected places are always found
    const selectedPlaces = places.filter(p => selectedPlaceIds.has(p.id));
    
    const [selectedItineraryId, setSelectedItineraryId] = useState<string>('');
    
    const groupedPlaces = useMemo(() => {
        if (groupBy === 'none') return { 'All Places': filteredPlaces };
        
        if (groupBy === 'drafts') {
            const drafts = filteredPlaces.filter(p => p.isIncomplete);
            const complete = filteredPlaces.filter(p => !p.isIncomplete);
            const groups: Record<string, Place[]> = {};
            if (drafts.length > 0) groups['Drafts'] = drafts;
            if (complete.length > 0) groups['Complete'] = complete;
            return groups;
        }
        
        const groups: Record<string, Place[]> = {};
        filteredPlaces.forEach(place => {
            const key = groupBy === 'type' ? place.type : (place.city || 'Unknown City');
            if (!groups[key]) groups[key] = [];
            groups[key].push(place);
        });
        
        const sortedGroups: Record<string, Place[]> = {};
        Object.keys(groups).sort().forEach(key => {
            sortedGroups[key] = groups[key];
        });
        
        return sortedGroups;
    }, [filteredPlaces, groupBy]);
    
    const activeItineraries = itineraries.filter(i => i.status === 'Planned' || i.status === 'In Progress');
    
    const handleAddToExistingItinerary = async () => {
        if (!selectedItineraryId || selectedPlaces.length === 0) return;
        
        const itinerary = itineraries.find(i => i.id === selectedItineraryId);
        if (!itinerary) return;
        
        const newStops: ItineraryStop[] = selectedPlaces.map((place, index) => {
            const stop: ItineraryStop = {
                id: `stop-${Date.now()}-${index}`,
                isManual: false,
                placeId: place.id,
                name: place.name,
                completed: false,
                order: (itinerary.stops?.length || 0) + index,
                source: 'places' as const
            };
            if (place.address) stop.address = place.address;
            if (place.lat) stop.lat = place.lat;
            if (place.lng) stop.lng = place.lng;
            return stop;
        });
        
        await updateItinerary(selectedItineraryId, {
            stops: [...(itinerary.stops || []), ...newStops]
        });
        
        setIsAddToItineraryOpen(false);
        clearSelection();
        setSelectedItineraryId('');
        alert(`Added ${selectedPlaces.length} place(s) to "${itinerary.name}"! View it in the Trips module.`);
    };

    // --- HANDLERS (Same as before) ---
    const handleViewDetails = (place: Place) => { setSelectedPlace(place); setIsDetailOpen(true); };
    const handleEdit = (place: Place) => { setSelectedPlace(place); setIsFormOpen(true); };
    const handleSave = async (placeData: Omit<Place, 'id'>) => {
        if (selectedPlace) await updatePlace(selectedPlace.id, placeData);
        else await addPlace({ ...placeData, visitedCount: 0 } as any);
        setIsFormOpen(false); setSelectedPlace(null);
    };
    const handleRecordVisitSave = async (visitData: any) => {
        if (!selectedPlace) return;
        
        const currentHistory = selectedPlace.visitHistory || [];
        
        if (visitData.isNewVisit === false && visitData.existingVisitId) {
            // Adding notes to an existing visit
            const updatedHistory = currentHistory.map(visit => {
                if (visit.id === visitData.existingVisitId) {
                    const combinedNotes = visit.notes 
                        ? `${visit.notes}\n\n---\n\n${visitData.notes}` 
                        : visitData.notes;
                    const combinedPhotos = [...(visit.photos || []), ...(visitData.photos || [])];
                    return { 
                        ...visit, 
                        notes: combinedNotes,
                        photos: combinedPhotos,
                        rating: visitData.rating // Update rating to latest
                    };
                }
                return visit;
            });
            
            // Create journal entry for the additional notes (use visit date)
            const journalEntry: Omit<JournalEntry, 'id'> = { 
                title: `Additional Notes: ${selectedPlace.name}`, 
                body: `Added notes for visit to ${selectedPlace.name} on ${visitData.date}.\n\nNotes: ${visitData.notes}`, 
                date: visitData.date, 
                mood: visitData.rating >= 4 ? 'Happy' : 'Neutral', 
                tags: ['Place Visit', 'Additional Notes', selectedPlace.type], 
                location: selectedPlace.name, 
                attachments: visitData.photos?.map((url: string, i: number) => ({ id: `img-${i}`, type: 'image', url, name: 'Visit Photo' })) 
            };
            await addJournalEntry(journalEntry);
            
            const updatedPhotos = [...(visitData.photos || []), ...(selectedPlace.photos || [])];
            await updatePlace(selectedPlace.id, { 
                rating: visitData.rating, 
                visitHistory: updatedHistory, 
                photos: updatedPhotos 
            });
        } else {
            // Creating a new visit entry
            const newVisit: VisitRecord = { 
                id: `v-${Date.now()}`, 
                date: visitData.date, 
                rating: visitData.rating, 
                notes: visitData.notes, 
                photos: visitData.photos 
            };
            const journalEntry: Omit<JournalEntry, 'id'> = { 
                title: `Visited ${selectedPlace.name}`, 
                body: `Visited ${selectedPlace.name} in ${selectedPlace.city}.\n\nRating: ${visitData.rating}/5\n\nNotes: ${visitData.notes}`, 
                date: visitData.date, 
                mood: visitData.rating >= 4 ? 'Happy' : 'Neutral', 
                tags: ['Place Visit', selectedPlace.type], 
                location: selectedPlace.name, 
                attachments: visitData.photos?.map((url: string, i: number) => ({ id: `img-${i}`, type: 'image', url, name: 'Visit Photo' })) 
            };
            await addJournalEntry(journalEntry);
            const updatedHistory = [newVisit, ...currentHistory];
            const updatedPhotos = [...(visitData.photos || []), ...(selectedPlace.photos || [])];
            await updatePlace(selectedPlace.id, { 
                visitedCount: (selectedPlace.visitedCount || 0) + 1, 
                lastVisited: visitData.date, 
                rating: visitData.rating, 
                visitHistory: updatedHistory, 
                photos: updatedPhotos 
            });
        }
        
        setIsRecordVisitOpen(false);
    };
    const handlePlanVisitClick = (event?: PlaceEvent) => { if (!selectedPlace) return; setTripPrepData({ place: selectedPlace, event }); setNewTripName(event ? `Trip to ${event.name}` : `Trip to ${selectedPlace.name}`); setNewTripStart(event?.startDate || new Date().toISOString().split('T')[0]); setNewTripEnd(event?.endDate || ''); setIsPlanTripOpen(true); };
    const handleCreateItinerary = async () => {
        if (!tripPrepData || !newTripName) return;
        const stop: ItineraryStop = { 
            id: `stop-${Date.now()}`, 
            isManual: false, 
            placeId: tripPrepData.place.id, 
            name: tripPrepData.place.name, 
            date: newTripStart, 
            time: '12:00', 
            completed: false,
            order: 0,
            source: 'places' as const
        };
        if (tripPrepData.event) stop.notes = `Attending: ${tripPrepData.event.name}`;
        if (tripPrepData.place.address) stop.address = tripPrepData.place.address;
        if (tripPrepData.place.lat) stop.lat = tripPrepData.place.lat;
        if (tripPrepData.place.lng) stop.lng = tripPrepData.place.lng;
        
        const newTrip: Omit<Itinerary, 'id'> = { name: newTripName, startDate: newTripStart, endDate: newTripEnd || newTripStart, status: 'Planned', stops: [stop] };
        await addItinerary(newTrip); setIsPlanTripOpen(false); setTripPrepData(null); alert("Trip Created! View it in the Trips module.");
    };

    const handleCreateItineraryFromSelection = async () => {
        if (selectedPlaces.length === 0 || !newTripName) return;
        
        const hasValidDates = newTripStart && newTripStart.trim() !== '';
        
        const stops: ItineraryStop[] = selectedPlaces.map((place, index) => {
            const stop: ItineraryStop = {
                id: `stop-${Date.now()}-${index}`,
                isManual: false,
                placeId: place.id,
                name: place.name,
                completed: false,
                order: index,
                source: 'places' as const
            };
            if (place.address) stop.address = place.address;
            if (hasValidDates) stop.date = newTripStart;
            if (place.lat) stop.lat = place.lat;
            if (place.lng) stop.lng = place.lng;
            return stop;
        });
        
        const newTrip: Omit<Itinerary, 'id'> = { 
            name: newTripName, 
            status: 'Planned',
            stops 
        };
        if (hasValidDates) {
            newTrip.startDate = newTripStart;
            newTrip.endDate = newTripEnd || newTripStart;
        }
        
        await addItinerary(newTrip);
        setIsCreateTripFromSelectionOpen(false);
        clearSelection();
        setNewTripName('');
        setNewTripStart('');
        setNewTripEnd('');
        alert(`Trip "${newTripName}" created with ${selectedPlaces.length} stops! View it in the Trips module.`);
    };

    const handleOpenDiscoverNearby = () => {
        setNearbyPlaces([]);
        setNearbyError(null);
        setIsDiscoverNearbyOpen(true);
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setNearbyError('Could not get your location. Please enable location services.');
                }
            );
        } else {
            setNearbyError('Geolocation is not supported by your browser.');
        }
    };

    const handleDiscoverNearby = async () => {
        if (!userLocation) {
            setNearbyError('Please wait for location to be detected or enable location services.');
            return;
        }

        setIsDiscoveringNearby(true);
        setNearbyError(null);

        try {
            const response = await fetch(
                `/api/places/nearbysearch/json?location=${userLocation.lat},${userLocation.lng}&radius=${nearbyRadius}&type=${nearbyType}`
            );
            const data = await response.json();

            if (data.status === 'OK' && data.results) {
                const mappedPlaces: NearbyPlace[] = data.results.map((place: any) => ({
                    placeId: place.place_id,
                    name: place.name,
                    vicinity: place.vicinity,
                    types: place.types || [],
                    rating: place.rating,
                    userRatingsTotal: place.user_ratings_total,
                    lat: place.geometry?.location?.lat,
                    lng: place.geometry?.location?.lng,
                    icon: place.icon
                }));
                setNearbyPlaces(mappedPlaces);
            } else if (data.status === 'ZERO_RESULTS') {
                setNearbyPlaces([]);
                setNearbyError('No places found nearby. Try increasing the radius or changing the type.');
            } else {
                setNearbyError(`Error: ${data.status}. Note: This feature requires a valid Google Maps API key with Places API enabled.`);
            }
        } catch (error) {
            console.error('Nearby search error:', error);
            setNearbyError('Failed to search for nearby places. Check console for details.');
        } finally {
            setIsDiscoveringNearby(false);
        }
    };

    const handleAddNearbyPlace = async (nearbyPlace: NearbyPlace) => {
        const placeData: Omit<Place, 'id'> = {
            name: nearbyPlace.name,
            address: nearbyPlace.vicinity,
            city: '',
            state: '',
            type: mapGoogleTypeToPlaceType(nearbyPlace.types),
            rating: nearbyPlace.rating || 0,
            notes: `Discovered via Nearby Search. Google Rating: ${nearbyPlace.rating || 'N/A'} (${nearbyPlace.userRatingsTotal || 0} reviews)`,
            website: '',
            lat: nearbyPlace.lat,
            lng: nearbyPlace.lng,
            visitedCount: 0,
            googleMapsData: {
                placeId: nearbyPlace.placeId,
                types: nearbyPlace.types
            }
        };
        await addPlace(placeData as any);
        alert(`Added "${nearbyPlace.name}" to your places!`);
    };

    const mapGoogleTypeToPlaceType = (types: string[]): PlaceType => {
        if (types.includes('restaurant')) return PlaceType.Restaurant;
        if (types.includes('cafe')) return PlaceType.Cafe;
        if (types.includes('bar')) return PlaceType.Restaurant;
        if (types.includes('museum')) return PlaceType.Museum;
        if (types.includes('park')) return PlaceType.Park;
        if (types.includes('tourist_attraction') || types.includes('point_of_interest')) return PlaceType.Other;
        if (types.includes('shopping_mall') || types.includes('store')) return PlaceType.Shop;
        if (types.includes('lodging') || types.includes('hotel')) return PlaceType.Other;
        if (types.includes('gym') || types.includes('health')) return PlaceType.Gym;
        if (types.includes('library')) return PlaceType.Library;
        if (types.includes('movie_theater') || types.includes('theater')) return PlaceType.Theater;
        return PlaceType.Other;
    };

    // --- COLUMNS ---
    const columns = [
        { key: 'name' as keyof Place, label: 'Name', sortable: true, render: (p: Place) => (
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 cursor-pointer hover:text-primary" onClick={() => handleViewDetails(p)}>{p.name}</span>
                {p.isIncomplete && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Draft</span>}
            </div>
        )},
        { key: 'type' as keyof Place, label: 'Type', sortable: true, render: (p: Place) => <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{p.type}</span> },
        { key: 'city' as keyof Place, label: 'City', sortable: true, render: (p: Place) => <span className="text-sm text-gray-600">{p.city || '-'}</span> },
        { key: 'rating' as keyof Place, label: 'Rating', sortable: true, render: (p: Place) => <span className="text-yellow-500 text-xs">{'★'.repeat(p.rating)}</span> },
        { key: 'visitedCount' as keyof Place, label: 'Visits', sortable: true, render: (p: Place) => <span className="text-xs text-gray-500">{p.visitedCount || 0}</span> },
        {
            key: 'actions' as any, label: 'Actions', sortable: false,
            render: (p: Place) => (
                <div className="flex gap-2 justify-end">
                    <button onClick={(e) => { e.stopPropagation(); handleViewDetails(p); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Eye size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded" title="Edit"><Edit2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Selection Mode Floating Bar */}
            {isSelectionMode && selectedPlaceIds.size > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up">
                    <span className="font-medium">{selectedPlaceIds.size} place{selectedPlaceIds.size !== 1 ? 's' : ''} selected</span>
                    <div className="h-6 w-px bg-white/30"></div>
                    <button 
                        onClick={() => {
                            setNewTripName(`Trip to ${selectedPlaces.length} Places`);
                            setNewTripStart('');
                            setNewTripEnd('');
                            setIsCreateTripFromSelectionOpen(true);
                        }}
                        className="flex items-center gap-2 bg-white text-primary px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        <CalendarPlus className="w-4 h-4" /> Plan Visit
                    </button>
                    <button 
                        onClick={() => setIsAddToItineraryOpen(true)}
                        disabled={activeItineraries.length === 0}
                        className="flex items-center gap-2 bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={activeItineraries.length === 0 ? 'No active itineraries to add to' : undefined}
                    >
                        <ListPlus className="w-4 h-4" /> Add to Trip
                    </button>
                    <button onClick={clearSelection} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-slide-down">
                <div className="flex items-center gap-4">
                     <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Places & Events</h2>
                     <span className="text-sm text-gray-500">{filteredPlaces.length} places</span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Selection Mode Toggle */}
                    <button 
                        onClick={() => {
                            if (isSelectionMode) {
                                clearSelection();
                            } else {
                                setIsSelectionMode(true);
                            }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSelectionMode 
                                ? 'bg-primary/10 text-primary border border-primary' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                        }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    {isSelectionMode && (
                        <button 
                            onClick={selectAllPlaces}
                            className="text-xs text-primary hover:underline"
                        >
                            Select All ({filteredPlaces.length})
                        </button>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Table View"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Group By Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <Layers className="w-4 h-4 text-gray-400 ml-2" />
                        <select 
                            value={groupBy} 
                            onChange={(e) => setGroupBy(e.target.value as 'none' | 'type' | 'city' | 'drafts')}
                            className="bg-transparent text-sm text-gray-700 border-none focus:ring-0 cursor-pointer pr-6"
                        >
                            <option value="none">No Grouping</option>
                            <option value="type">Group by Type</option>
                            <option value="city">Group by City</option>
                            <option value="drafts">Group by Status</option>
                        </select>
                    </div>
                    
                    <button onClick={handleOpenDiscoverNearby} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm">
                        <Compass className="w-4 h-4" /> Discover Nearby
                    </button>
                    <button onClick={() => { setSelectedPlace(null); setIsFormOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm">
                        <Plus className="w-4 h-4" /> Add Place
                    </button>
                </div>
            </div>

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-enter">
                    <SortableTable data={filteredPlaces} columns={columns} />
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="space-y-4 animate-enter">
                    {(Object.entries(groupedPlaces) as [string, Place[]][]).map(([groupName, groupPlaces]) => (
                        <div key={groupName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {groupBy !== 'none' && (
                                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {groupBy === 'type' ? (
                                            <Building className="w-4 h-4 text-primary" />
                                        ) : groupBy === 'drafts' ? (
                                            groupName === 'Drafts' ? (
                                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            )
                                        ) : (
                                            <MapPinned className="w-4 h-4 text-emerald-500" />
                                        )}
                                        <h3 className="font-semibold text-gray-800">{groupName}</h3>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{groupPlaces.length} places</span>
                                </div>
                            )}
                            <div className="divide-y divide-gray-100">
                                {groupPlaces.map((place) => (
                                    <div 
                                        key={place.id}
                                        className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                            selectedPlaceIds.has(place.id) ? 'bg-primary/5' : ''
                                        }`}
                                        onClick={() => isSelectionMode ? togglePlaceSelection(place.id) : handleViewDetails(place)}
                                    >
                                        {isSelectionMode && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); togglePlaceSelection(place.id); }}
                                                className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                                    selectedPlaceIds.has(place.id) 
                                                        ? 'bg-primary text-white' 
                                                        : 'border border-gray-300 text-transparent hover:border-primary'
                                                }`}
                                            >
                                                <CheckSquare size={12} />
                                            </button>
                                        )}
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                                            {place.photos && place.photos.length > 0 ? (
                                                <img src={place.photos[0]} alt={place.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <MapPin size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-medium text-gray-900 truncate">{place.name}</h4>
                                                {place.isIncomplete && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Draft</span>
                                                )}
                                                <span className="text-yellow-500 text-xs flex-shrink-0">{'★'.repeat(place.rating)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                {groupBy !== 'type' && (
                                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{place.type}</span>
                                                )}
                                                {groupBy !== 'city' && place.city && (
                                                    <span className="flex items-center gap-1 text-xs">
                                                        <MapPin size={10} /> {place.city}
                                                    </span>
                                                )}
                                                {place.visitedCount && place.visitedCount > 0 && (
                                                    <span className="text-xs text-gray-400">• {place.visitedCount} visits</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(place); }}
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleViewDetails(place); }}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Place Details" size="lg">
                {selectedPlace && (
                    <PlaceDetailContent 
                        place={selectedPlace} 
                        onPlanVisit={handlePlanVisitClick} 
                        onRecordVisit={() => setIsRecordVisitOpen(true)} 
                        onAddToItinerary={() => {
                            setSelectedPlaceIds(new Set([selectedPlace.id]));
                            setIsDetailOpen(false);
                            setIsAddToItineraryOpen(true);
                        }}
                        onRefreshData={async () => {
                            if (!selectedPlace.googleMapsData?.placeId) return;
                            try {
                                const response = await fetch(`/api/places-detailed/${selectedPlace.googleMapsData.placeId}`);
                                if (response.ok) {
                                    const data = await response.json();
                                    const updatedGoogleData = {
                                        ...selectedPlace.googleMapsData,
                                        phone: data.internationalPhoneNumber || data.nationalPhoneNumber,
                                        website: data.websiteUri,
                                        rating: data.rating,
                                        totalRatings: data.userRatingCount,
                                        priceLevel: data.priceLevel ? parseInt(data.priceLevel.replace('PRICE_LEVEL_', '')) : undefined,
                                        openingHours: data.regularOpeningHours?.weekdayDescriptions || [],
                                        lastUpdated: new Date().toISOString()
                                    };
                                    await updatePlace(selectedPlace.id, { googleMapsData: updatedGoogleData });
                                    setSelectedPlace({ ...selectedPlace, googleMapsData: updatedGoogleData });
                                }
                            } catch (err) {
                                console.error('Failed to refresh Google data:', err);
                            }
                        }}
                    />
                )}
            </Modal>
            <Modal isOpen={isRecordVisitOpen} onClose={() => setIsRecordVisitOpen(false)} title="Record a Visit" size="md">
                {selectedPlace && <RecordVisitModal place={selectedPlace} onClose={() => setIsRecordVisitOpen(false)} onSave={handleRecordVisitSave} />}
            </Modal>
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedPlace ? 'Edit Place' : 'Add Place'} size="lg">
                <PlaceForm initialData={selectedPlace || undefined} existingPlaces={places} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
            </Modal>
            <Modal isOpen={isPlanTripOpen} onClose={() => setIsPlanTripOpen(false)} title="Create Trip for Event" size="md">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 text-sm text-blue-900">
                        Planning trip to <strong>{tripPrepData?.place.name}</strong>
                        {tripPrepData?.event && <span> for <strong>{tripPrepData.event.name}</strong></span>}
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip Name</label><input type="text" className="w-full border rounded p-2 text-sm" value={newTripName} onChange={e => setNewTripName(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label><input type="date" className="w-full border rounded p-2 text-sm" value={newTripStart} onChange={e => setNewTripStart(e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label><input type="date" className="w-full border rounded p-2 text-sm" value={newTripEnd} onChange={e => setNewTripEnd(e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4"><button onClick={() => setIsPlanTripOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-sm text-gray-600">Cancel</button><button onClick={handleCreateItinerary} className="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary-hover">Create Itinerary</button></div>
                </div>
            </Modal>

            <Modal isOpen={isDiscoverNearbyOpen} onClose={() => setIsDiscoverNearbyOpen(false)} title="Discover Nearby Places" size="lg">
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                <Compass className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Find Places Near You</h3>
                                <p className="text-sm text-gray-600">Discover restaurants, cafes, attractions and more</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            {userLocation ? (
                                <span className="text-emerald-700">
                                    Location detected: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                </span>
                            ) : (
                                <span className="text-amber-600 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Detecting your location...
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Place Type</label>
                            <div className="grid grid-cols-4 gap-2">
                                {NEARBY_PLACE_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setNearbyType(type.id)}
                                        className={`p-2 rounded-lg text-center transition-all ${
                                            nearbyType === type.id 
                                                ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-700' 
                                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="text-lg">{type.icon}</span>
                                        <div className="text-[10px] mt-1">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Search Radius</label>
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min="500"
                                    max="5000"
                                    step="500"
                                    value={nearbyRadius}
                                    onChange={(e) => setNearbyRadius(parseInt(e.target.value))}
                                    className="w-full accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>500m</span>
                                    <span className="font-medium text-emerald-600">{(nearbyRadius / 1000).toFixed(1)} km</span>
                                    <span>5km</span>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleDiscoverNearby}
                                disabled={!userLocation || isDiscoveringNearby}
                                className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDiscoveringNearby ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" /> Search Nearby
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {nearbyError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                            {nearbyError}
                        </div>
                    )}

                    {nearbyPlaces.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase">
                                Found {nearbyPlaces.length} Places
                            </h4>
                            <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                                {nearbyPlaces.map((place) => (
                                    <div 
                                        key={place.placeId}
                                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 truncate">{place.name}</span>
                                                {place.rating && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                                        <Star className="w-3 h-3" fill="currentColor" />
                                                        {place.rating.toFixed(1)}
                                                        <span className="text-gray-400">({place.userRatingsTotal})</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{place.vicinity}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="View on Google Maps"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleAddNearbyPlace(place)}
                                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {nearbyPlaces.length === 0 && !nearbyError && !isDiscoveringNearby && userLocation && (
                        <div className="text-center py-8 text-gray-500">
                            <Compass className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Click "Search Nearby" to discover places around you</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Create Trip from Selection Modal */}
            <Modal isOpen={isCreateTripFromSelectionOpen} onClose={() => setIsCreateTripFromSelectionOpen(false)} title="Create Trip from Selected Places" size="md">
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                <Route className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Creating Trip with {selectedPlaces.length} Stops</h4>
                                <p className="text-xs text-gray-500">These places will be added as stops in your new itinerary</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedPlaces.map((place, index) => (
                                <span key={place.id} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-gray-200">
                                    <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                                    {place.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                            placeholder="e.g., Weekend Food Tour"
                            value={newTripName} 
                            onChange={e => setNewTripName(e.target.value)} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
                            <input 
                                type="date" 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                value={newTripStart} 
                                onChange={e => setNewTripStart(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                            <input 
                                type="date" 
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                value={newTripEnd} 
                                onChange={e => setNewTripEnd(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 italic">
                        Tip: You can leave dates empty to create an "Unplanned" trip and add dates later.
                    </p>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => setIsCreateTripFromSelectionOpen(false)} 
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCreateItineraryFromSelection}
                            disabled={!newTripName.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <Route className="w-4 h-4" /> Create Itinerary
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add to Existing Itinerary Modal */}
            <Modal isOpen={isAddToItineraryOpen} onClose={() => { setIsAddToItineraryOpen(false); setSelectedItineraryId(''); }} title="Add to Existing Trip" size="md">
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <ListPlus className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Adding {selectedPlaces.length} Place{selectedPlaces.length !== 1 ? 's' : ''}</h4>
                                <p className="text-xs text-gray-500">Select a trip to add these places to</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedPlaces.map((place) => (
                                <span key={place.id} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-blue-200">
                                    <MapPin className="w-3 h-3 text-blue-500" />
                                    {place.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {activeItineraries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Route className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">No Active Trips</p>
                            <p className="text-xs mt-1">Create a new trip first, or use "Plan Visit" to create one with these places.</p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Trip</label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {activeItineraries.map((itinerary) => (
                                    <button
                                        key={itinerary.id}
                                        onClick={() => setSelectedItineraryId(itinerary.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                                            selectedItineraryId === itinerary.id
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h5 className="font-medium text-gray-900">{itinerary.name}</h5>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {itinerary.stops?.length || 0} stops
                                                    {itinerary.startDate && ` • ${new Date(itinerary.startDate).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                itinerary.status === 'In Progress' 
                                                    ? 'bg-amber-100 text-amber-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {itinerary.status}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => { setIsAddToItineraryOpen(false); setSelectedItineraryId(''); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddToExistingItinerary}
                            disabled={!selectedItineraryId}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <ListPlus className="w-4 h-4" /> Add to Trip
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PlacesView;
