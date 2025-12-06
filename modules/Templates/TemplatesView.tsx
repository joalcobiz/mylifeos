import React, { useState, useMemo } from 'react';
import { 
    Plus, Grid, Search, Trash2, MoreVertical, ChevronLeft, ChevronRight,
    Book, Film, Tv, Music, Gamepad, Coffee, ShoppingBag, 
    Smartphone, DollarSign, Plane, Target, Palette, Home, Car, Package,
    Check, Camera, PenTool, Dumbbell, Globe, Star, Edit3, X, Filter,
    Utensils, Clock, Hammer, Lock, Eye, Calendar, Hash, Link, ToggleLeft,
    Layers, FileText, Sparkles
} from 'lucide-react';
import { Template, TemplateItem, TemplateField } from '../../types';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, EmptyState, Tabs } from '../../components/ui';

interface CollectionDef {
    name: string;
    description: string;
    category: string;
    icon: any;
    fields: TemplateField[];
}

const COLLECTION_LIB: CollectionDef[] = [
    { name: 'Books', category: 'Media', description: 'Reading list & library', icon: Book, fields: [{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'author', label: 'Author', type: 'text' }, { key: 'genre', label: 'Genre', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: ['To Read', 'Reading', 'Finished', 'Abandoned'] }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'started', label: 'Started', type: 'date' }, { key: 'finished', label: 'Finished', type: 'date' }, { key: 'pages', label: 'Pages', type: 'number' }, { key: 'notes', label: 'Notes', type: 'text' }] },
    { name: 'Movies', category: 'Media', description: 'Watchlist & reviews', icon: Film, fields: [{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'director', label: 'Director', type: 'text' }, { key: 'year', label: 'Year', type: 'number' }, { key: 'genre', label: 'Genre', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: ['To Watch', 'Watched', 'Rewatched'] }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'watchedOn', label: 'Watched On', type: 'date' }, { key: 'review', label: 'Review', type: 'text' }] },
    { name: 'TV Shows', category: 'Media', description: 'Episode tracker', icon: Tv, fields: [{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'season', label: 'Season', type: 'number' }, { key: 'episode', label: 'Episode', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Watching', 'Waiting', 'Finished', 'Dropped'] }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'network', label: 'Network', type: 'text' }] },
    { name: 'Video Games', category: 'Media', description: 'Game backlog', icon: Gamepad, fields: [{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'platform', label: 'Platform', type: 'select', options: ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile'] }, { key: 'status', label: 'Status', type: 'select', options: ['Backlog', 'Playing', 'Completed', '100%', 'Abandoned'] }, { key: 'hoursPlayed', label: 'Hours Played', type: 'number' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'genre', label: 'Genre', type: 'text' }] },
    { name: 'Music Albums', category: 'Media', description: 'Albums & playlists', icon: Music, fields: [{ key: 'title', label: 'Album', type: 'text', required: true }, { key: 'artist', label: 'Artist', type: 'text' }, { key: 'year', label: 'Year', type: 'number' }, { key: 'genre', label: 'Genre', type: 'text' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'favorite', label: 'Favorite Track', type: 'text' }] },
    { name: 'Podcasts', category: 'Media', description: 'Favorite feeds', icon: Music, fields: [{ key: 'name', label: 'Podcast Name', type: 'text', required: true }, { key: 'host', label: 'Host', type: 'text' }, { key: 'topic', label: 'Topic', type: 'text' }, { key: 'frequency', label: 'Frequency', type: 'text' }, { key: 'link', label: 'Link', type: 'url' }] },

    { name: 'Wine List', category: 'Food', description: 'Cellar inventory', icon: Coffee, fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'vintage', label: 'Vintage', type: 'number' }, { key: 'region', label: 'Region', type: 'text' }, { key: 'grape', label: 'Grape', type: 'text' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'price', label: 'Price', type: 'currency' }, { key: 'qty', label: 'Qty', type: 'number' }, { key: 'notes', label: 'Tasting Notes', type: 'text' }] },
    { name: 'Whiskey/Spirits', category: 'Food', description: 'Spirits collection', icon: Coffee, fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['Whiskey', 'Bourbon', 'Scotch', 'Rum', 'Vodka', 'Gin', 'Tequila', 'Other'] }, { key: 'age', label: 'Age (Years)', type: 'number' }, { key: 'region', label: 'Region', type: 'text' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'price', label: 'Price', type: 'currency' }] },
    { name: 'Recipes', category: 'Food', description: 'Cookbook', icon: Utensils, fields: [{ key: 'name', label: 'Dish Name', type: 'text', required: true }, { key: 'cuisine', label: 'Cuisine', type: 'text' }, { key: 'prepTime', label: 'Prep Time (min)', type: 'number' }, { key: 'cookTime', label: 'Cook Time (min)', type: 'number' }, { key: 'servings', label: 'Servings', type: 'number' }, { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'] }, { key: 'link', label: 'Recipe Link', type: 'url' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'notes', label: 'Notes', type: 'text' }] },
    { name: 'Restaurants', category: 'Food', description: 'Dining wishlist', icon: Utensils, fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'cuisine', label: 'Cuisine', type: 'text' }, { key: 'location', label: 'Location', type: 'text' }, { key: 'priceRange', label: 'Price Range', type: 'select', options: ['$', '$$', '$$$', '$$$$'] }, { key: 'visited', label: 'Visited', type: 'boolean' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'mustTry', label: 'Must Try Dish', type: 'text' }, { key: 'notes', label: 'Notes', type: 'text' }] },

    { name: 'Watches', category: 'Lifestyle', description: 'Timepieces', icon: Clock, fields: [{ key: 'brand', label: 'Brand', type: 'text', required: true }, { key: 'model', label: 'Model', type: 'text' }, { key: 'reference', label: 'Reference', type: 'text' }, { key: 'movement', label: 'Movement', type: 'select', options: ['Automatic', 'Manual', 'Quartz', 'Solar', 'Kinetic'] }, { key: 'diameter', label: 'Diameter (mm)', type: 'number' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }, { key: 'purchasePrice', label: 'Purchase Price', type: 'currency' }, { key: 'currentValue', label: 'Current Value', type: 'currency' }, { key: 'lastServiceDate', label: 'Last Service', type: 'date' }] },
    { name: 'Clothing', category: 'Lifestyle', description: 'Wardrobe inventory', icon: ShoppingBag, fields: [{ key: 'item', label: 'Item', type: 'text', required: true }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'size', label: 'Size', type: 'text' }, { key: 'color', label: 'Color', type: 'text' }, { key: 'category', label: 'Category', type: 'select', options: ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'] }, { key: 'location', label: 'Location', type: 'text' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }, { key: 'price', label: 'Price', type: 'currency' }] },
    { name: 'Fragrances', category: 'Lifestyle', description: 'Perfume/Cologne', icon: ShoppingBag, fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'type', label: 'Type', type: 'select', options: ['EDT', 'EDP', 'Parfum', 'Cologne'] }, { key: 'size', label: 'Size (ml)', type: 'number' }, { key: 'season', label: 'Best Season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter', 'All Year'] }, { key: 'notes', label: 'Scent Notes', type: 'text' }, { key: 'rating', label: 'Rating', type: 'rating' }] },

    { name: 'Subscriptions', category: 'Tech', description: 'Recurring services', icon: Smartphone, fields: [{ key: 'service', label: 'Service', type: 'text', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Streaming', 'Software', 'Gaming', 'News', 'Fitness', 'Other'] }, { key: 'cost', label: 'Cost', type: 'currency' }, { key: 'cycle', label: 'Cycle', type: 'select', options: ['Monthly', 'Yearly', 'Weekly'] }, { key: 'renewal', label: 'Renewal Date', type: 'date' }, { key: 'sharedWith', label: 'Shared With', type: 'text' }, { key: 'active', label: 'Active', type: 'boolean' }] },
    { name: 'Software Licenses', category: 'Tech', description: 'Keys & codes', icon: Lock, fields: [{ key: 'software', label: 'Software', type: 'text', required: true }, { key: 'key', label: 'License Key', type: 'text' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }, { key: 'expiry', label: 'Expiration', type: 'date' }, { key: 'seats', label: 'Seats/Devices', type: 'number' }, { key: 'cost', label: 'Cost', type: 'currency' }] },
    { name: 'Smart Home', category: 'Tech', description: 'Device inventory', icon: Smartphone, fields: [{ key: 'device', label: 'Device Name', type: 'text', required: true }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'type', label: 'Type', type: 'select', options: ['Light', 'Thermostat', 'Camera', 'Lock', 'Sensor', 'Speaker', 'Other'] }, { key: 'room', label: 'Room', type: 'text' }, { key: 'ip', label: 'IP Address', type: 'text' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }] },

    { name: 'Investment Tracker', category: 'Financial', description: 'Portfolio log', icon: DollarSign, fields: [{ key: 'asset', label: 'Asset', type: 'text', required: true }, { key: 'ticker', label: 'Ticker', type: 'text' }, { key: 'type', label: 'Type', type: 'select', options: ['Stock', 'ETF', 'Crypto', 'Bond', 'Real Estate', 'Other'] }, { key: 'qty', label: 'Quantity', type: 'number' }, { key: 'avgPrice', label: 'Avg Price', type: 'currency' }, { key: 'currentPrice', label: 'Current Price', type: 'currency' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }] },
    { name: 'Invoices', category: 'Financial', description: 'Billing tracker', icon: DollarSign, fields: [{ key: 'client', label: 'Client', type: 'text', required: true }, { key: 'invoiceNo', label: 'Invoice #', type: 'text' }, { key: 'amount', label: 'Amount', type: 'currency' }, { key: 'issueDate', label: 'Issue Date', type: 'date' }, { key: 'due', label: 'Due Date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Paid', 'Overdue'] }] },

    { name: 'Travel Wishlist', category: 'Travel', description: 'Places to go', icon: Plane, fields: [{ key: 'destination', label: 'Destination', type: 'text', required: true }, { key: 'country', label: 'Country', type: 'text' }, { key: 'region', label: 'Region', type: 'text' }, { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] }, { key: 'bestTime', label: 'Best Time to Visit', type: 'text' }, { key: 'estimatedCost', label: 'Est. Cost', type: 'currency' }, { key: 'notes', label: 'Why I Want to Go', type: 'text' }] },
    { name: 'Countries Visited', category: 'Travel', description: 'Travel log', icon: Globe, fields: [{ key: 'country', label: 'Country', type: 'text', required: true }, { key: 'year', label: 'Year Visited', type: 'number' }, { key: 'cities', label: 'Cities', type: 'text' }, { key: 'duration', label: 'Duration (Days)', type: 'number' }, { key: 'highlights', label: 'Highlights', type: 'text' }, { key: 'rating', label: 'Rating', type: 'rating' }] },
    { name: 'Packing List', category: 'Travel', description: 'Standard gear', icon: Package, fields: [{ key: 'item', label: 'Item', type: 'text', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Clothing', 'Toiletries', 'Electronics', 'Documents', 'Other'] }, { key: 'qty', label: 'Quantity', type: 'number' }, { key: 'packed', label: 'Packed', type: 'boolean' }] },

    { name: 'Courses', category: 'Growth', description: 'Learning path', icon: Book, fields: [{ key: 'course', label: 'Course', type: 'text', required: true }, { key: 'platform', label: 'Platform', type: 'text' }, { key: 'instructor', label: 'Instructor', type: 'text' }, { key: 'duration', label: 'Duration (hrs)', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Wishlist', 'Enrolled', 'In Progress', 'Completed'] }, { key: 'startDate', label: 'Start Date', type: 'date' }, { key: 'completedDate', label: 'Completed Date', type: 'date' }, { key: 'rating', label: 'Rating', type: 'rating' }, { key: 'certificate', label: 'Certificate', type: 'url' }] },
    { name: 'Fitness Log', category: 'Growth', description: 'Workouts', icon: Dumbbell, fields: [{ key: 'date', label: 'Date', type: 'date', required: true }, { key: 'workout', label: 'Workout Type', type: 'select', options: ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Sports', 'Other'] }, { key: 'duration', label: 'Duration (mins)', type: 'number' }, { key: 'exercises', label: 'Exercises', type: 'text' }, { key: 'notes', label: 'Notes', type: 'text' }] },

    { name: 'Plants', category: 'Home', description: 'Green friends', icon: Home, fields: [{ key: 'name', label: 'Plant Name', type: 'text', required: true }, { key: 'species', label: 'Species', type: 'text' }, { key: 'location', label: 'Location', type: 'text' }, { key: 'light', label: 'Light Needs', type: 'select', options: ['Low', 'Medium', 'Bright Indirect', 'Direct Sun'] }, { key: 'waterDays', label: 'Water Every (Days)', type: 'number' }, { key: 'lastWatered', label: 'Last Watered', type: 'date' }, { key: 'lastFertilized', label: 'Last Fertilized', type: 'date' }, { key: 'acquired', label: 'Acquired', type: 'date' }] },
    { name: 'Home Inventory', category: 'Home', description: 'Insurance list', icon: Home, fields: [{ key: 'item', label: 'Item', type: 'text', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Electronics', 'Furniture', 'Appliances', 'Art', 'Jewelry', 'Other'] }, { key: 'room', label: 'Room', type: 'text' }, { key: 'value', label: 'Value', type: 'currency' }, { key: 'purchaseDate', label: 'Purchase Date', type: 'date' }, { key: 'serial', label: 'Serial #', type: 'text' }, { key: 'warranty', label: 'Warranty Until', type: 'date' }] },
    { name: 'Maintenance', category: 'Home', description: 'Repairs log', icon: Hammer, fields: [{ key: 'task', label: 'Task', type: 'text', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['HVAC', 'Plumbing', 'Electrical', 'Appliance', 'Exterior', 'Other'] }, { key: 'date', label: 'Date Done', type: 'date' }, { key: 'nextDue', label: 'Next Due', type: 'date' }, { key: 'cost', label: 'Cost', type: 'currency' }, { key: 'provider', label: 'Service Provider', type: 'text' }, { key: 'notes', label: 'Notes', type: 'text' }] },

    { name: 'Car Maintenance', category: 'Vehicles', description: 'Service log', icon: Car, fields: [{ key: 'service', label: 'Service', type: 'text', required: true }, { key: 'date', label: 'Date', type: 'date' }, { key: 'mileage', label: 'Mileage', type: 'number' }, { key: 'cost', label: 'Cost', type: 'currency' }, { key: 'shop', label: 'Shop', type: 'text' }, { key: 'nextDue', label: 'Next Due (miles)', type: 'number' }, { key: 'notes', label: 'Notes', type: 'text' }] },

    { name: 'Art Collection', category: 'Collectibles', description: 'Portfolio', icon: Palette, fields: [{ key: 'title', label: 'Title', type: 'text', required: true }, { key: 'artist', label: 'Artist', type: 'text' }, { key: 'medium', label: 'Medium', type: 'text' }, { key: 'year', label: 'Year', type: 'number' }, { key: 'dimensions', label: 'Dimensions', type: 'text' }, { key: 'purchasePrice', label: 'Purchase Price', type: 'currency' }, { key: 'currentValue', label: 'Current Value', type: 'currency' }, { key: 'location', label: 'Location', type: 'text' }] },
    { name: 'Trading Cards', category: 'Collectibles', description: 'Cards', icon: Package, fields: [{ key: 'name', label: 'Card Name', type: 'text', required: true }, { key: 'set', label: 'Set', type: 'text' }, { key: 'year', label: 'Year', type: 'number' }, { key: 'grade', label: 'Grade', type: 'text' }, { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Near Mint', 'Excellent', 'Good', 'Poor'] }, { key: 'qty', label: 'Quantity', type: 'number' }, { key: 'value', label: 'Value', type: 'currency' }] },
];

const CATEGORY_ICONS: Record<string, any> = {
    'Media': Film, 'Food': Coffee, 'Lifestyle': ShoppingBag, 'Tech': Smartphone,
    'Financial': DollarSign, 'Travel': Plane, 'Growth': Target, 'Home': Home,
    'Vehicles': Car, 'Collectibles': Package, 'Creative': Palette
};

const TemplatesView: React.FC = () => {
    const { data: userCollections, add: addCollection, update: updateCollection, remove: removeCollection } = useFirestore<Template>('collections');
    
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    
    const [selectedTemplate, setSelectedTemplate] = useState<CollectionDef | null>(null);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [activeItemData, setActiveItemData] = useState<TemplateItem>({ id: '' });
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string; type: 'collection' | 'item' }>({ isOpen: false, id: '', name: '', type: 'collection' });

    const activeCollection = userCollections.find(c => c.id === selectedCollectionId);
    const categories = useMemo(() => Array.from(new Set(COLLECTION_LIB.map(t => t.category))), []);
    const userCategories = useMemo(() => Array.from(new Set(userCollections.map(c => c.category))), [userCollections]);

    const filteredCollections = useMemo(() => {
        return userCollections.filter(c => {
            if (filterCategory !== 'All' && c.category !== filterCategory) return false;
            if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [userCollections, filterCategory, searchQuery]);

    const handleCreateCollection = async () => {
        if (!selectedTemplate || !newCollectionName.trim()) return;
        const newCol = await addCollection({
            name: newCollectionName,
            type: selectedTemplate.name,
            category: selectedTemplate.category,
            description: selectedTemplate.description,
            fields: selectedTemplate.fields,
            items: []
        });
        setIsLibraryOpen(false);
        setNewCollectionName('');
        setSelectedTemplate(null);
    };

    const handleDeleteCollection = async () => {
        if (deleteConfirm.type !== 'collection' || !deleteConfirm.id) return;
        await removeCollection(deleteConfirm.id);
        if (selectedCollectionId === deleteConfirm.id) {
            setSelectedCollectionId(null);
            setMobileView('list');
        }
        setDeleteConfirm({ isOpen: false, id: '', name: '', type: 'collection' });
    };

    const handleSaveItem = async () => {
        if (!activeCollection) return;
        const newItem = { ...activeItemData, id: activeItemData.id || `item-${Date.now()}` };
        const existingIndex = activeCollection.items.findIndex(i => i.id === newItem.id);
        let newItems = [...activeCollection.items];
        if (existingIndex >= 0) {
            newItems[existingIndex] = newItem;
        } else {
            newItems.push(newItem);
        }
        await updateCollection(activeCollection.id, { items: newItems });
        setIsAddItemOpen(false);
        setActiveItemData({ id: '' });
    };

    const handleDeleteItem = async () => {
        if (!activeCollection || deleteConfirm.type !== 'item' || !deleteConfirm.id) return;
        const newItems = activeCollection.items.filter(i => i.id !== deleteConfirm.id);
        await updateCollection(activeCollection.id, { items: newItems });
        setDeleteConfirm({ isOpen: false, id: '', name: '', type: 'collection' });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirm.type === 'collection') {
            await handleDeleteCollection();
        } else {
            await handleDeleteItem();
        }
    };

    const openCollection = (id: string) => {
        setSelectedCollectionId(id);
        setMobileView('detail');
    };

    const displayedItems = activeCollection?.items.filter(item => {
        if (!searchQuery) return true;
        return Object.values(item).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));
    }) || [];

    const renderFieldValue = (field: TemplateField, value: any) => {
        if (value === undefined || value === null || value === '') return <span className="text-gray-300">-</span>;
        if (field.type === 'rating') {
            return (
                <div className="flex text-yellow-400 text-xs">
                    {'★'.repeat(Number(value) || 0)}
                    <span className="text-gray-200">{'★'.repeat(5 - (Number(value) || 0))}</span>
                </div>
            );
        }
        if (field.type === 'currency') return <span className="font-mono text-green-600">${Number(value).toLocaleString()}</span>;
        if (field.type === 'boolean') return value ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-300" />;
        if (field.type === 'url') return <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px] block text-xs">{value}</a>;
        if (field.type === 'select') {
            const colors: Record<string, string> = { 
                'Finished': 'bg-green-100 text-green-700', 'Completed': 'bg-green-100 text-green-700', 
                'Paid': 'bg-green-100 text-green-700', 'Reading': 'bg-blue-100 text-blue-700',
                'Watching': 'bg-blue-100 text-blue-700', 'Playing': 'bg-blue-100 text-blue-700',
                'In Progress': 'bg-blue-100 text-blue-700', 'Unpaid': 'bg-red-100 text-red-700', 
                'Overdue': 'bg-red-100 text-red-700', 'High': 'bg-red-100 text-red-700',
                'To Read': 'bg-purple-100 text-purple-700', 'To Watch': 'bg-purple-100 text-purple-700',
                'Backlog': 'bg-purple-100 text-purple-700', 'Wishlist': 'bg-purple-100 text-purple-700'
            };
            return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>;
        }
        return <span className="text-sm text-gray-700">{String(value)}</span>;
    };

    const renderFieldInput = (field: TemplateField) => {
        const value = activeItemData[field.key] || '';
        const baseClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none";
        
        if (field.type === 'select') {
            return (
                <select className={baseClass} value={value} onChange={e => setActiveItemData({...activeItemData, [field.key]: e.target.value})}>
                    <option value="">Select...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        }
        if (field.type === 'rating') {
            return (
                <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" onClick={() => setActiveItemData({...activeItemData, [field.key]: n})}
                            className={`text-2xl ${Number(value) >= n ? 'text-yellow-400' : 'text-gray-200'} hover:text-yellow-400 transition-colors`}>★</button>
                    ))}
                </div>
            );
        }
        if (field.type === 'boolean') {
            return (
                <button type="button" onClick={() => setActiveItemData({...activeItemData, [field.key]: !value})}
                    className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-200'} relative`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
            );
        }
        if (field.type === 'date') return <input type="date" className={baseClass} value={value} onChange={e => setActiveItemData({...activeItemData, [field.key]: e.target.value})} />;
        if (field.type === 'number' || field.type === 'currency') return <input type="number" step={field.type === 'currency' ? '0.01' : '1'} className={baseClass} value={value} onChange={e => setActiveItemData({...activeItemData, [field.key]: e.target.value})} />;
        return <input type="text" className={baseClass} value={value} placeholder={field.label} onChange={e => setActiveItemData({...activeItemData, [field.key]: e.target.value})} />;
    };

    return (
        <div className="space-y-4 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    {mobileView === 'detail' && activeCollection && (
                        <button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 hover:bg-white/20 rounded-lg">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <Grid size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">
                            {mobileView === 'detail' && activeCollection ? activeCollection.name : 'Collections'}
                        </h2>
                        <p className="text-white/80 text-sm">
                            {mobileView === 'detail' && activeCollection 
                                ? `${activeCollection.items.length} items`
                                : `${userCollections.length} collections`
                            }
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {mobileView === 'detail' && activeCollection ? (
                        <Button onClick={() => { setActiveItemData({ id: '' }); setIsAddItemOpen(true); }} variant="glass" icon={Plus}>
                            Add Item
                        </Button>
                    ) : (
                        <Button onClick={() => setIsLibraryOpen(true)} variant="glass" icon={Plus}>
                            New Collection
                        </Button>
                    )}
                </div>
            </div>

            <div className={`${mobileView === 'detail' ? 'hidden md:block' : 'block'}`}>
                <Card padding="sm" className="mb-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search collections..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                            <button
                                onClick={() => setFilterCategory('All')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === 'All' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >All</button>
                            {userCategories.map(cat => (
                                <button key={cat} onClick={() => setFilterCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >{cat}</button>
                            ))}
                        </div>
                    </div>
                </Card>

                {filteredCollections.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Grid}
                            title="No collections yet"
                            description="Create your first collection to start tracking"
                            action={{ label: 'Create Collection', onClick: () => setIsLibraryOpen(true) }}
                        />
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCollections.map(col => {
                            const IconComp = CATEGORY_ICONS[col.category] || Grid;
                            const primaryField = col.fields.find(f => f.required) || col.fields[0];
                            const previewItems = col.items.slice(0, 3);
                            
                            return (
                                <Card key={col.id} padding="none" className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden" onClick={() => openCollection(col.id)}>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-purple-600">
                                                    <IconComp size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{col.name}</h3>
                                                    <p className="text-xs text-gray-500">{col.category} · {col.type}</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === col.id ? null : col.id); }}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {menuOpenId === col.id && (
                                                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                                                        <button onClick={(e) => { e.stopPropagation(); openCollection(col.id); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: col.id, name: col.name, type: 'collection' }); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-1">{col.description}</p>
                                        
                                        <div className="flex items-center justify-between">
                                            <Badge variant="default" size="sm">{col.items.length} items</Badge>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    
                                    {previewItems.length > 0 && (
                                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {previewItems.map((item, i) => (
                                                    <span key={i} className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100 truncate max-w-[100px]">
                                                        {item[primaryField?.key || 'title'] || item[Object.keys(item)[1]] || 'Item'}
                                                    </span>
                                                ))}
                                                {col.items.length > 3 && (
                                                    <span className="text-xs text-gray-400">+{col.items.length - 3} more</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {mobileView === 'detail' && activeCollection && (
                <div className="md:hidden space-y-4">
                    <Card padding="sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </Card>
                    
                    {displayedItems.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon={Package}
                                title="No items yet"
                                description="Add your first item to this collection"
                                action={{ label: 'Add Item', onClick: () => { setActiveItemData({ id: '' }); setIsAddItemOpen(true); }}}
                            />
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {displayedItems.map(item => {
                                const primaryField = activeCollection.fields.find(f => f.required) || activeCollection.fields[0];
                                const secondaryFields = activeCollection.fields.filter(f => f.key !== primaryField?.key).slice(0, 3);
                                
                                return (
                                    <Card key={item.id} padding="sm" className="hover:shadow-md transition-shadow" onClick={() => { setActiveItemData(item); setIsAddItemOpen(true); }}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900 truncate">{item[primaryField?.key || 'title'] || 'Untitled'}</h4>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {secondaryFields.map(f => item[f.key] && (
                                                        <div key={f.key} className="text-xs text-gray-500">
                                                            {renderFieldValue(f, item[f.key])}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: item.id, name: item[activeCollection?.fields?.[0]?.key || 'id'] || 'Item', type: 'item' }); }} className="p-2 text-gray-300 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="hidden md:block">
                {activeCollection && (
                    <Card padding="none" className="mt-4">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">{activeCollection.name}</h3>
                                <p className="text-sm text-gray-500">{activeCollection.items.length} items</p>
                            </div>
                            <Button onClick={() => { setActiveItemData({ id: '' }); setIsAddItemOpen(true); }} variant="primary" size="sm" icon={Plus}>
                                Add Item
                            </Button>
                        </div>
                        
                        {displayedItems.length === 0 ? (
                            <div className="p-8">
                                <EmptyState icon={Package} title="No items" description="Add your first item" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {activeCollection.fields.slice(0, 6).map(f => (
                                                <th key={f.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{f.label}</th>
                                            ))}
                                            <th className="px-4 py-3 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {displayedItems.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveItemData(item); setIsAddItemOpen(true); }}>
                                                {activeCollection.fields.slice(0, 6).map(f => (
                                                    <td key={f.key} className="px-4 py-3">{renderFieldValue(f, item[f.key])}</td>
                                                ))}
                                                <td className="px-4 py-3">
                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: item.id, name: item[activeCollection?.fields?.[0]?.key || 'id'] || 'Item', type: 'item' }); }} className="p-1.5 text-gray-300 hover:text-red-500 rounded">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            <Modal isOpen={isLibraryOpen} onClose={() => { setIsLibraryOpen(false); setSelectedTemplate(null); setNewCollectionName(''); }} title="Create Collection" size="full">
                {!selectedTemplate ? (
                    <div className="space-y-5">
                        {/* Header Section */}
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Layers size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Choose a Collection Type</h3>
                                    <p className="text-xs text-gray-500">Select a template to start organizing your data</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Categories Grid */}
                        <div className="max-h-[55vh] overflow-y-auto space-y-6 pr-2">
                            {categories.map(cat => (
                                <div key={cat}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white py-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        {cat}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {COLLECTION_LIB.filter(t => t.category === cat).map((tpl, idx) => (
                                            <button key={idx} onClick={() => { setSelectedTemplate(tpl); setNewCollectionName(tpl.name); }}
                                                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary-muted hover:shadow-sm transition-all text-left group">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                                    <tpl.icon className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-semibold text-gray-900 text-sm block truncate group-hover:text-primary transition-colors">{tpl.name}</span>
                                                    <span className="text-xs text-gray-400 block truncate">{tpl.description}</span>
                                                </div>
                                                <span className="text-xs text-gray-300 group-hover:text-primary/60">{tpl.fields.length}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Template Info */}
                        <div className="space-y-4">
                            <button onClick={() => setSelectedTemplate(null)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                                <ChevronLeft size={16} />
                                Back to templates
                            </button>
                            
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                                        <selectedTemplate.icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{selectedTemplate.name}</h3>
                                        <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white/70 rounded-lg p-4 border border-purple-100/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText size={14} className="text-purple-500" />
                                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Included Fields ({selectedTemplate.fields.length})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTemplate.fields.map((f, i) => (
                                            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                                {f.label}
                                                {f.required && <span className="text-red-500 ml-0.5">*</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Column - Collection Setup */}
                        <div className="space-y-4">
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Name Your Collection</h3>
                                        <p className="text-xs text-gray-500">Choose a memorable name for your collection</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Collection Name</label>
                                    <input 
                                        type="text" 
                                        autoFocus 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                        placeholder="e.g. My Book Collection"
                                        value={newCollectionName} 
                                        onChange={e => setNewCollectionName(e.target.value)} 
                                    />
                                    <p className="text-xs text-gray-400 mt-2">You can rename this later from the collection settings</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Check size={16} className="text-green-500" />
                                    <span>Ready to create your <span className="font-medium text-gray-900">{selectedTemplate.name}</span> collection</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <Button variant="secondary" fullWidth onClick={() => setSelectedTemplate(null)}>Cancel</Button>
                                <Button variant="primary" fullWidth onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
                                    Create Collection
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isAddItemOpen} onClose={() => { setIsAddItemOpen(false); setActiveItemData({ id: '' }); }} title={activeItemData.id ? 'Edit Item' : 'Add Item'} size="full">
                {activeCollection && (
                    <div className="space-y-5">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{activeItemData.id ? 'Edit' : 'Add'} {activeCollection.name} Item</h3>
                                    <p className="text-xs text-gray-500">Fill in the details below</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Form Fields */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                                {activeCollection.fields.map(field => (
                                    <div key={field.key} className={field.type === 'text' && field.key.toLowerCase().includes('note') ? 'md:col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        {renderFieldInput(field)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" fullWidth onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                            <Button variant="primary" fullWidth onClick={handleSaveItem}>
                                {activeItemData.id ? 'Save Changes' : 'Add Item'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '', type: 'collection' })}
                onConfirm={handleConfirmDelete}
                title={deleteConfirm.type === 'collection' ? 'Delete Collection' : 'Delete Item'}
                message={deleteConfirm.type === 'collection' 
                    ? `Are you sure you want to delete "${deleteConfirm.name}" and all its items? This action cannot be undone.`
                    : `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default TemplatesView;
