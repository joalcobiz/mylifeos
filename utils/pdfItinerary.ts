import { Itinerary, ItineraryStop, TimeBucket } from '../types';

const TIME_BUCKETS: { 
    id: TimeBucket; 
    label: string; 
    sortKey: string; 
}[] = [
    { id: 'earlyMorning', label: 'Early Morning', sortKey: '06:00' },
    { id: 'morning', label: 'Morning', sortKey: '09:00' },
    { id: 'midday', label: 'Midday', sortKey: '12:00' },
    { id: 'earlyAfternoon', label: 'Early Afternoon', sortKey: '14:00' },
    { id: 'lateAfternoon', label: 'Late Afternoon', sortKey: '16:00' },
    { id: 'evening', label: 'Evening', sortKey: '19:00' },
    { id: 'night', label: 'Night', sortKey: '21:30' },
    { id: 'lateNight', label: 'Late Night', sortKey: '02:00' }
];

const THEME_COLORS: { [key: string]: { r: number; g: number; b: number } } = {
    default: { r: 99, g: 102, b: 241 },
    tropical: { r: 245, g: 158, b: 11 },
    adventure: { r: 34, g: 197, b: 94 },
    city: { r: 100, g: 116, b: 139 },
    beach: { r: 6, g: 182, b: 212 },
    mountain: { r: 16, g: 185, b: 129 }
};

const getTimeBucketLabel = (bucket?: TimeBucket): string => {
    const info = TIME_BUCKETS.find(b => b.id === bucket);
    return info?.label || 'Unscheduled';
};

const getTimeBucketSortKey = (bucket?: TimeBucket): string => {
    const info = TIME_BUCKETS.find(b => b.id === bucket);
    return info?.sortKey || '23:59';
};

const getStopSortKey = (stop: ItineraryStop): string => {
    if (stop.time) return stop.time;
    if (stop.sortKey) return stop.sortKey;
    if (stop.timeBucket) return getTimeBucketSortKey(stop.timeBucket);
    return '23:59';
};

const sortStops = (stops: ItineraryStop[]): ItineraryStop[] => {
    return [...stops].sort((a, b) => {
        const aHasManual = a.manualOrder !== undefined;
        const bHasManual = b.manualOrder !== undefined;
        
        if (aHasManual && bHasManual) {
            return a.manualOrder! - b.manualOrder!;
        }
        if (aHasManual && !bHasManual) {
            return -1;
        }
        if (!aHasManual && bHasManual) {
            return 1;
        }
        
        const timeA = getStopSortKey(a);
        const timeB = getStopSortKey(b);
        const timeCompare = timeA.localeCompare(timeB);
        if (timeCompare !== 0) return timeCompare;
        
        return a.name.localeCompare(b.name);
    });
};

const groupStopsByDay = (stops: ItineraryStop[]): { [date: string]: ItineraryStop[] } => {
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

const getSortedDates = (grouped: { [date: string]: ItineraryStop[] }): string[] => {
    return Object.keys(grouped).sort((a, b) => 
        a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : new Date(a).getTime() - new Date(b).getTime()
    );
};

export const generateItineraryPDF = async (itinerary: Itinerary): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    
    const grouped = groupStopsByDay(itinerary.stops || []);
    const sortedDates = getSortedDates(grouped);
    
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;
    
    const checkPageBreak = (neededHeight: number): boolean => {
        if (yPos + neededHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };
    
    const themeColor = THEME_COLORS[itinerary.theme || 'default'] || THEME_COLORS.default;
    
    pdf.setFillColor(themeColor.r, themeColor.g, themeColor.b);
    pdf.rect(0, 0, pageWidth, 45, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(itinerary.name, margin, 20);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const startDate = itinerary.startDate ? new Date(itinerary.startDate) : null;
    const endDate = itinerary.endDate ? new Date(itinerary.endDate) : null;
    const dateRange = startDate && endDate
        ? `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : 'Dates not set';
    pdf.text(dateRange, margin, 30);
    
    const totalStops = itinerary.stops?.length || 0;
    const totalDays = sortedDates.filter(d => d !== 'Unscheduled').length;
    pdf.text(`${totalDays} Days | ${totalStops} Stops`, margin, 38);
    
    yPos = 55;
    
    if (itinerary.notes) {
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        const noteLines = pdf.splitTextToSize(itinerary.notes, contentWidth);
        pdf.text(noteLines, margin, yPos);
        yPos += noteLines.length * 5 + 10;
    }
    
    sortedDates.forEach((date, dayIndex) => {
        const stops = grouped[date];
        const dayHeight = 15 + (stops.length * 25);
        checkPageBreak(Math.min(dayHeight, 60));
        
        pdf.setFillColor(themeColor.r, themeColor.g, themeColor.b, 0.1);
        pdf.setDrawColor(themeColor.r, themeColor.g, themeColor.b);
        pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');
        
        pdf.setTextColor(themeColor.r, themeColor.g, themeColor.b);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const dayLabel = date === 'Unscheduled' 
            ? 'Unscheduled' 
            : `Day ${dayIndex + 1}: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        pdf.text(dayLabel, margin + 4, yPos + 8);
        
        pdf.setTextColor(120, 120, 120);
        pdf.setFontSize(10);
        pdf.text(`${stops.length} stop${stops.length !== 1 ? 's' : ''}`, pageWidth - margin - 20, yPos + 8);
        
        yPos += 16;
        
        stops.forEach((stop, stopIndex) => {
            const hasNotes = stop.notes && stop.notes.trim();
            const hasAddress = stop.address && stop.address.trim();
            const rowHeight = hasNotes ? 20 : (hasAddress ? 16 : 12);
            checkPageBreak(rowHeight + 4);
            
            const timeDisplay = stop.time || (stop.timeBucket ? getTimeBucketLabel(stop.timeBucket) : '');
            
            pdf.setTextColor(themeColor.r, themeColor.g, themeColor.b);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${stopIndex + 1}`, margin + 2, yPos + 4);
            
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            const nameMaxWidth = contentWidth - 50;
            const truncatedName = stop.name.length > 40 ? stop.name.substring(0, 37) + '...' : stop.name;
            pdf.text(truncatedName, margin + 10, yPos + 4);
            
            if (timeDisplay) {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.text(timeDisplay, pageWidth - margin - pdf.getTextWidth(timeDisplay), yPos + 4);
            }
            
            if (hasAddress) {
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(130, 130, 130);
                const shortAddress = stop.address!.length > 60 ? stop.address!.substring(0, 57) + '...' : stop.address!;
                pdf.text(shortAddress, margin + 10, yPos + 9);
            }
            
            if (hasNotes) {
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(100, 100, 100);
                const noteY = hasAddress ? yPos + 14 : yPos + 9;
                const shortNote = stop.notes!.length > 80 ? stop.notes!.substring(0, 77) + '...' : stop.notes!;
                pdf.text(shortNote, margin + 10, noteY);
            }
            
            yPos += rowHeight + 2;
        });
        
        yPos += 8;
    });
    
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Created with LIFEOS', margin, pageHeight - 10);
    }
    
    pdf.save(`${itinerary.name.replace(/\s+/g, '_')}_itinerary.pdf`);
};
