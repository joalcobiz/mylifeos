import React, { useEffect, useRef } from 'react';
import { Place } from '../../types';

// Leaflet is loaded via CDN in index.html, so we treat it as global
declare global {
    interface Window {
        L: any;
    }
}

interface MapViewProps {
    places: Place[];
    onPlaceClick?: (place: Place) => void;
}

const MapView: React.FC<MapViewProps> = ({ places, onPlaceClick }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapContainerRef.current || !window.L) return;

        // Initialize map if not already initialized
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([0, 0], 2);
            
            // Add OpenStreetMap tile layer
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);
        }

        // Cleanup existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add markers for places
        const bounds = window.L.latLngBounds([]);
        let hasMarkers = false;

        places.forEach(place => {
            if (place.lat !== undefined && place.lng !== undefined) {
                // Create a simple custom icon using HTML
                const icon = window.L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="
                        background-color: #2563eb;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                const marker = window.L.marker([place.lat, place.lng], { icon })
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`
                        <div class="text-sm font-sans">
                            <strong class="block text-gray-900 mb-1">${place.name}</strong>
                            <span class="text-xs text-gray-500 block mb-1">${place.type}</span>
                            <span class="text-xs text-gray-600 block">${place.address}</span>
                        </div>
                    `);
                
                marker.on('click', () => {
                    if (onPlaceClick) {
                        onPlaceClick(place);
                    }
                });

                markersRef.current.push(marker);
                bounds.extend([place.lat, place.lng]);
                hasMarkers = true;
            }
        });

        // Fit bounds if we have markers
        if (hasMarkers) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            // Default view if no markers
            mapInstanceRef.current.setView([45.5152, -122.6784], 10); // Default to Portland as per mock data
        }

        // Force map resize to ensure tiles load correctly if container resized
        setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 100);

    }, [places, onPlaceClick]);

    return (
        <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative z-0">
             <div ref={mapContainerRef} className="w-full h-full" />
             {places.filter(p => p.lat && p.lng).length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none z-[1000]">
                     <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-600 font-medium">
                         No places with coordinates found
                     </div>
                 </div>
             )}
        </div>
    );
};

export default MapView;