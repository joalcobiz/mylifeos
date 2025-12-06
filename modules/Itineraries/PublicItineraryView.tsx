import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plane, Calendar, MapPin, Clock, CheckCircle, ChevronDown, ChevronRight,
    Sun, Moon, Sunrise, Sunset, Coffee, Download, ExternalLink, Map as MapIcon,
    Loader2, AlertCircle, Route, CloudSun, CloudMoon, Timer, DollarSign,
    MessageSquare, Navigation, Bookmark, ArrowLeft
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Itinerary, ItineraryStop, TimeBucket, StopPlaceType } from '../../types';
import { generateItineraryPDF } from '../../utils/pdfItinerary';

const TIME_BUCKETS: { 
    id: TimeBucket; 
    label: string; 
    icon: any; 
    gradient: string;
    textColor: string;
}[] = [
    { id: 'earlyMorning', label: 'Early Morning', icon: Sunrise, gradient: 'from-rose-400 to-orange-400', textColor: 'text-rose-600' },
    { id: 'morning', label: 'Morning', icon: Sun, gradient: 'from-amber-400 to-yellow-400', textColor: 'text-amber-600' },
    { id: 'midday', label: 'Midday', icon: CloudSun, gradient: 'from-yellow-400 to-orange-400', textColor: 'text-yellow-600' },
    { id: 'earlyAfternoon', label: 'Early Afternoon', icon: Sun, gradient: 'from-orange-400 to-amber-500', textColor: 'text-orange-600' },
    { id: 'lateAfternoon', label: 'Late Afternoon', icon: Coffee, gradient: 'from-amber-500 to-orange-500', textColor: 'text-amber-700' },
    { id: 'evening', label: 'Evening', icon: Sunset, gradient: 'from-purple-400 to-pink-500', textColor: 'text-purple-600' },
    { id: 'night', label: 'Night', icon: Moon, gradient: 'from-indigo-500 to-purple-600', textColor: 'text-indigo-600' },
    { id: 'lateNight', label: 'Late Night', icon: CloudMoon, gradient: 'from-slate-600 to-indigo-700', textColor: 'text-slate-600' }
];

const STOP_PLACE_TYPES: { value: StopPlaceType; icon: any; color: string }[] = [
    { value: 'Restaurant', icon: Coffee, color: 'text-orange-500' },
    { value: 'Hotel', icon: MapPin, color: 'text-blue-500' },
    { value: 'Attraction', icon: MapPin, color: 'text-purple-500' },
    { value: 'Museum', icon: MapPin, color: 'text-amber-600' },
    { value: 'Park', icon: MapPin, color: 'text-green-500' },
    { value: 'Beach', icon: MapPin, color: 'text-cyan-500' },
    { value: 'Shopping', icon: MapPin, color: 'text-pink-500' },
    { value: 'Entertainment', icon: MapPin, color: 'text-violet-500' },
    { value: 'Transport', icon: MapPin, color: 'text-gray-500' },
    { value: 'Other', icon: MapPin, color: 'text-gray-400' }
];

const getTimeSegment = (time: string, bucket?: TimeBucket) => {
    if (bucket) {
        const info = TIME_BUCKETS.find(b => b.id === bucket);
        return info || TIME_BUCKETS[1];
    }
    if (!time) return { label: 'Unscheduled', icon: Clock, gradient: 'from-gray-300 to-gray-400', textColor: 'text-gray-400' };
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 8) return TIME_BUCKETS[0];
    if (hour >= 8 && hour < 12) return TIME_BUCKETS[1];
    if (hour >= 12 && hour < 14) return TIME_BUCKETS[2];
    if (hour >= 14 && hour < 18) return TIME_BUCKETS[3];
    if (hour >= 18 && hour < 21) return TIME_BUCKETS[5];
    return TIME_BUCKETS[6];
};

const getPlaceTypeInfo = (type?: StopPlaceType) => {
    return STOP_PLACE_TYPES.find(t => t.value === type) || STOP_PLACE_TYPES[9];
};

const themeGradients: Record<string, string> = {
    default: 'from-cyan-500 to-blue-500',
    tropical: 'from-emerald-400 to-teal-500',
    adventure: 'from-orange-500 to-red-500',
    city: 'from-slate-500 to-gray-600',
    beach: 'from-cyan-400 to-blue-400',
    mountain: 'from-emerald-600 to-green-700'
};

interface PublicItineraryViewProps {
    shareToken: string;
    onBack?: () => void;
}

const PublicItineraryView: React.FC<PublicItineraryViewProps> = ({ shareToken, onBack }) => {
    const [itinerary, setItinerary] = useState<Itinerary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchItinerary = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const docRef = doc(db, 'publicItineraries', shareToken);
                const docSnap = await getDoc(docRef);
                
                if (!docSnap.exists()) {
                    setError('This trip is not available or the link has expired');
                    return;
                }
                
                const data = { id: docSnap.id, ...docSnap.data() } as Itinerary;
                
                if (!data.isPublic) {
                    setError('This trip is no longer publicly shared');
                    return;
                }
                
                setItinerary(data);
            } catch (err) {
                console.error('Error fetching itinerary:', err);
                setError('Failed to load itinerary. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        
        if (shareToken) {
            fetchItinerary();
        } else {
            setError('Invalid share link. Please check the URL and try again.');
            setLoading(false);
        }
    }, [shareToken]);

    const groupedStops = useMemo(() => {
        if (!itinerary?.stops) return {};
        const groups: { [date: string]: ItineraryStop[] } = {};
        
        itinerary.stops.forEach(stop => {
            const date = stop.date || 'Unscheduled';
            if (!groups[date]) groups[date] = [];
            groups[date].push(stop);
        });
        
        Object.keys(groups).forEach(date => {
            groups[date].sort((a, b) => {
                const timeA = a.time || a.sortKey || '23:59';
                const timeB = b.time || b.sortKey || '23:59';
                return timeA.localeCompare(timeB);
            });
        });
        
        return groups;
    }, [itinerary]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedStops).sort((a, b) => 
            a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()
        );
    }, [groupedStops]);

    const toggleDayCollapse = (date: string) => {
        setCollapsedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const handleExport = async () => {
        if (!itinerary) return;
        await generateItineraryPDF(itinerary);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 size={48} className="animate-spin mx-auto mb-4 text-cyan-400" />
                    <p className="text-lg">Loading itinerary...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md text-center border border-white/20">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
                    <p className="text-gray-300 mb-6">{error}</p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
                        >
                            <ArrowLeft size={16} /> Go Back
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!itinerary) return null;

    const themeGradient = themeGradients[itinerary.theme || 'default'];
    const completedStops = itinerary.stops?.filter(s => s.completed).length || 0;
    const totalStops = itinerary.stops?.length || 0;
    const tripDays = itinerary.startDate && itinerary.endDate
        ? Math.ceil((new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className={`bg-gradient-to-r ${themeGradient} py-12 px-4 relative overflow-hidden`}>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full mix-blend-overlay opacity-10"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full mix-blend-overlay opacity-10"></div>
                </div>
                
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
                            <Plane size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">{itinerary.name}</h1>
                            {itinerary.startDate && itinerary.endDate && (
                                <p className="text-white/80 flex items-center gap-2 mt-1">
                                    <Calendar size={16} />
                                    {new Date(itinerary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                                    {' - '}
                                    {new Date(itinerary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-white">{tripDays}</div>
                            <div className="text-white/80 text-sm">Days</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-white">{totalStops}</div>
                            <div className="text-white/80 text-sm">Stops</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-white">{completedStops}</div>
                            <div className="text-white/80 text-sm">Completed</div>
                        </div>
                    </div>
                    
                    {itinerary.notes && (
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-white/90">
                            <p>{itinerary.notes}</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Route size={20} className="text-blue-500" />
                        Itinerary
                    </h2>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-gray-700 text-sm font-medium"
                    >
                        <Download size={16} /> Export PDF
                    </button>
                </div>
                
                <div className="space-y-4">
                    {sortedDates.map((date, dayIndex) => {
                        const dayStops = groupedStops[date];
                        const isCollapsed = collapsedDays.has(date);
                        const completedInDay = dayStops.filter(s => s.completed).length;
                        const isToday = new Date(date).toDateString() === new Date().toDateString();
                        
                        return (
                            <div 
                                key={date}
                                className={`rounded-2xl overflow-hidden bg-white shadow-sm border ${
                                    isToday ? 'border-blue-300 shadow-lg shadow-blue-100' : 'border-gray-100'
                                }`}
                            >
                                <button
                                    onClick={() => toggleDayCollapse(date)}
                                    className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${
                                        isToday 
                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                                            isToday 
                                                ? 'bg-white/20 text-white' 
                                                : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md'
                                        }`}>
                                            {dayIndex + 1}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-lg flex items-center gap-2">
                                                {date === 'Unscheduled' 
                                                    ? 'Unscheduled' 
                                                    : new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                {isToday && (
                                                    <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                                                        Today
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-sm ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                                                {dayStops.length} stops • {completedInDay} completed
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-20 rounded-full overflow-hidden ${isToday ? 'bg-white/30' : 'bg-gray-200'}`}>
                                            <div 
                                                className={`h-full transition-all ${isToday ? 'bg-white' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                                                style={{ width: `${dayStops.length > 0 ? (completedInDay / dayStops.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </button>
                                
                                {!isCollapsed && (
                                    <div className="p-5 space-y-3">
                                        {dayStops.map((stop, idx) => {
                                            const placeInfo = getPlaceTypeInfo(stop.placeType);
                                            const PlaceIcon = placeInfo.icon;
                                            const timeInfo = getTimeSegment(stop.time || '', stop.timeBucket);
                                            const TimeIcon = timeInfo.icon;
                                            
                                            return (
                                                <div 
                                                    key={stop.id}
                                                    className={`p-4 rounded-xl border transition-all ${
                                                        stop.completed 
                                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                                                            : 'bg-gray-50 border-gray-100'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${timeInfo.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                                                            <TimeIcon size={18} />
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {stop.completed && (
                                                                    <CheckCircle size={16} className="text-green-500" />
                                                                )}
                                                                <span className={`font-semibold text-lg ${stop.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                                    {stop.name}
                                                                </span>
                                                                {stop.placeType && stop.placeType !== 'Other' && (
                                                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                                                        {stop.placeType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2 flex-wrap">
                                                                {stop.time && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock size={12} />
                                                                        {stop.time}
                                                                    </span>
                                                                )}
                                                                {!stop.time && stop.timeBucket && (
                                                                    <span className={`flex items-center gap-1 ${timeInfo.textColor}`}>
                                                                        <TimeIcon size={12} />
                                                                        {timeInfo.label}
                                                                    </span>
                                                                )}
                                                                {stop.address && (
                                                                    <span className="flex items-center gap-1 truncate">
                                                                        <MapPin size={12} />
                                                                        {stop.address}
                                                                    </span>
                                                                )}
                                                                {stop.duration && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Timer size={12} />
                                                                        {stop.duration}min
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {stop.notes && (
                                                                <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2">
                                                                    <MessageSquare size={12} className="inline mr-1.5 text-gray-400" />
                                                                    {stop.notes}
                                                                </p>
                                                            )}
                                                            
                                                            {(stop.lat && stop.lng) || stop.googlePlaceId ? (
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}${stop.googlePlaceId ? `&query_place_id=${stop.googlePlaceId}` : ''}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <Navigation size={12} /> View on Map
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                        
                                                        <div className="text-sm bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                                                            #{idx + 1}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="bg-gray-100 py-8 text-center">
                <p className="text-gray-500 text-sm">
                    Shared via <span className="font-semibold text-gray-700">LIFEOS</span> Trip Planner
                </p>
            </div>
        </div>
    );
};

export default PublicItineraryView;
