import React, { useState, useMemo } from 'react';
import { 
    Users, Search, ChevronDown, ChevronUp, Info, Heart, Calendar, MapPin,
    User, Baby, Crown, Star, Camera, FileText, Plus, Eye, X, Clock,
    BookOpen, Home, Route, Cake, GraduationCap, Briefcase, Church,
    Award, TreePine, GitBranch, AlertTriangle
} from 'lucide-react';
import Modal from '../../components/Modal';
import { Card, Button, Badge, Input, EmptyState } from '../../components/ui';

interface FamilyMember {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    maidenName?: string;
    gender: 'male' | 'female' | 'other';
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    isLiving: boolean;
    profilePhotoUrl?: string;
    biography?: string;
    fatherId?: string;
    motherId?: string;
    spouseIds?: string[];
    childrenIds?: string[];
    generation: number;
    lifeEvents?: LifeEvent[];
}

interface LifeEvent {
    id: string;
    type: 'birth' | 'education' | 'career' | 'marriage' | 'residence' | 'death' | 'achievement';
    title: string;
    date?: string;
    location?: string;
    description?: string;
}

const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
    {
        id: '1',
        firstName: 'Margaret',
        middleName: 'Rose',
        lastName: 'Thompson',
        maidenName: 'Williams',
        gender: 'female',
        birthDate: '1925-03-15',
        birthPlace: 'Dublin, Ireland',
        deathDate: '2010-11-22',
        deathPlace: 'Boston, MA',
        isLiving: false,
        biography: 'Margaret was the matriarch of the Thompson family. She emigrated from Ireland in 1948 and built a life full of love and hard work.',
        generation: 1,
        childrenIds: ['3', '4'],
        lifeEvents: [
            { id: 'e1', type: 'birth', title: 'Born in Dublin', date: '1925-03-15', location: 'Dublin, Ireland' },
            { id: 'e2', type: 'residence', title: 'Emigrated to America', date: '1948-06-01', location: 'Boston, MA' },
            { id: 'e3', type: 'marriage', title: 'Married Robert Thompson', date: '1950-09-14', location: 'St. Patrick\'s Church, Boston' },
            { id: 'e4', type: 'death', title: 'Passed away peacefully', date: '2010-11-22', location: 'Boston, MA' }
        ]
    },
    {
        id: '2',
        firstName: 'Robert',
        middleName: 'James',
        lastName: 'Thompson',
        gender: 'male',
        birthDate: '1922-07-08',
        birthPlace: 'Boston, MA',
        deathDate: '2005-04-30',
        deathPlace: 'Boston, MA',
        isLiving: false,
        biography: 'Robert served in WWII before returning home to build Thompson Construction, a family business that lasted three generations.',
        generation: 1,
        spouseIds: ['1'],
        childrenIds: ['3', '4'],
        lifeEvents: [
            { id: 'e5', type: 'birth', title: 'Born in Boston', date: '1922-07-08', location: 'Boston, MA' },
            { id: 'e6', type: 'career', title: 'Founded Thompson Construction', date: '1952-01-15', location: 'Boston, MA' },
            { id: 'e7', type: 'achievement', title: 'Company reached 100 employees', date: '1975-06-01', location: 'Boston, MA' }
        ]
    },
    {
        id: '3',
        firstName: 'William',
        middleName: 'Robert',
        lastName: 'Thompson',
        gender: 'male',
        birthDate: '1952-02-28',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'William took over the family construction business and expanded it across New England.',
        fatherId: '2',
        motherId: '1',
        generation: 2,
        spouseIds: ['5'],
        childrenIds: ['7', '8'],
        lifeEvents: [
            { id: 'e8', type: 'education', title: 'Graduated MIT', date: '1974-05-15', location: 'Cambridge, MA' },
            { id: 'e9', type: 'marriage', title: 'Married Susan Miller', date: '1978-06-22', location: 'Boston, MA' },
            { id: 'e10', type: 'career', title: 'Became CEO of Thompson Construction', date: '1985-01-01', location: 'Boston, MA' }
        ]
    },
    {
        id: '4',
        firstName: 'Elizabeth',
        middleName: 'Anne',
        lastName: 'Chen',
        maidenName: 'Thompson',
        gender: 'female',
        birthDate: '1955-09-12',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'Elizabeth became a renowned pediatric surgeon, combining her Irish heritage with her passion for helping children.',
        fatherId: '2',
        motherId: '1',
        generation: 2,
        spouseIds: ['6'],
        childrenIds: ['9', '10'],
        lifeEvents: [
            { id: 'e11', type: 'education', title: 'MD from Harvard Medical School', date: '1981-05-20', location: 'Boston, MA' },
            { id: 'e12', type: 'career', title: 'Chief of Pediatric Surgery', date: '1995-07-01', location: 'Boston Children\'s Hospital' }
        ]
    },
    {
        id: '5',
        firstName: 'Susan',
        middleName: 'Marie',
        lastName: 'Thompson',
        maidenName: 'Miller',
        gender: 'female',
        birthDate: '1954-11-03',
        birthPlace: 'Providence, RI',
        isLiving: true,
        biography: 'Susan is a celebrated local artist whose paintings capture the beauty of New England.',
        generation: 2,
        spouseIds: ['3'],
        childrenIds: ['7', '8']
    },
    {
        id: '6',
        firstName: 'David',
        lastName: 'Chen',
        gender: 'male',
        birthDate: '1953-04-17',
        birthPlace: 'San Francisco, CA',
        isLiving: true,
        biography: 'David is a retired professor of Asian Studies at Boston University.',
        generation: 2,
        spouseIds: ['4'],
        childrenIds: ['9', '10']
    },
    {
        id: '7',
        firstName: 'James',
        middleName: 'William',
        lastName: 'Thompson',
        gender: 'male',
        birthDate: '1980-03-22',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'James is now the third-generation leader of Thompson Construction.',
        fatherId: '3',
        motherId: '5',
        generation: 3,
        spouseIds: ['11'],
        childrenIds: ['13', '14']
    },
    {
        id: '8',
        firstName: 'Emily',
        middleName: 'Rose',
        lastName: 'Garcia',
        maidenName: 'Thompson',
        gender: 'female',
        birthDate: '1983-07-14',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'Emily is an environmental lawyer working on climate policy in Washington D.C.',
        fatherId: '3',
        motherId: '5',
        generation: 3,
        spouseIds: ['12'],
        childrenIds: ['15']
    },
    {
        id: '9',
        firstName: 'Michael',
        lastName: 'Chen',
        gender: 'male',
        birthDate: '1985-01-30',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'Michael is a software engineer at a major tech company.',
        fatherId: '6',
        motherId: '4',
        generation: 3
    },
    {
        id: '10',
        firstName: 'Sarah',
        middleName: 'Lin',
        lastName: 'Chen',
        gender: 'female',
        birthDate: '1988-12-05',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'Sarah followed her mother into medicine and is currently a pediatric resident.',
        fatherId: '6',
        motherId: '4',
        generation: 3
    },
    {
        id: '11',
        firstName: 'Amanda',
        lastName: 'Thompson',
        maidenName: 'Brooks',
        gender: 'female',
        birthDate: '1982-08-19',
        birthPlace: 'New York, NY',
        isLiving: true,
        generation: 3,
        spouseIds: ['7'],
        childrenIds: ['13', '14']
    },
    {
        id: '12',
        firstName: 'Carlos',
        lastName: 'Garcia',
        gender: 'male',
        birthDate: '1981-05-11',
        birthPlace: 'Miami, FL',
        isLiving: true,
        generation: 3,
        spouseIds: ['8'],
        childrenIds: ['15']
    },
    {
        id: '13',
        firstName: 'Olivia',
        middleName: 'Margaret',
        lastName: 'Thompson',
        gender: 'female',
        birthDate: '2010-04-02',
        birthPlace: 'Boston, MA',
        isLiving: true,
        biography: 'The youngest generation, named after her great-great-grandmother.',
        fatherId: '7',
        motherId: '11',
        generation: 4
    },
    {
        id: '14',
        firstName: 'Ethan',
        middleName: 'Robert',
        lastName: 'Thompson',
        gender: 'male',
        birthDate: '2012-09-18',
        birthPlace: 'Boston, MA',
        isLiving: true,
        fatherId: '7',
        motherId: '11',
        generation: 4
    },
    {
        id: '15',
        firstName: 'Sofia',
        middleName: 'Elena',
        lastName: 'Garcia',
        gender: 'female',
        birthDate: '2015-06-27',
        birthPlace: 'Washington, DC',
        isLiving: true,
        fatherId: '12',
        motherId: '8',
        generation: 4
    }
];

const EVENT_ICONS: Record<string, any> = {
    birth: Baby,
    education: GraduationCap,
    career: Briefcase,
    marriage: Heart,
    residence: Home,
    death: TreePine,
    achievement: Award
};

const GenealogyView: React.FC = () => {
    const [isGuideExpanded, setIsGuideExpanded] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGeneration, setFilterGeneration] = useState<number | 'all'>('all');
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const filteredMembers = useMemo(() => {
        let result = [...MOCK_FAMILY_MEMBERS];
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(m => 
                m.firstName.toLowerCase().includes(q) ||
                m.lastName.toLowerCase().includes(q) ||
                m.maidenName?.toLowerCase().includes(q) ||
                m.birthPlace?.toLowerCase().includes(q)
            );
        }
        
        if (filterGeneration !== 'all') {
            result = result.filter(m => m.generation === filterGeneration);
        }
        
        return result.sort((a, b) => a.generation - b.generation || a.firstName.localeCompare(b.firstName));
    }, [searchQuery, filterGeneration]);

    const getFullName = (member: FamilyMember) => {
        let name = member.firstName;
        if (member.middleName) name += ` ${member.middleName}`;
        name += ` ${member.lastName}`;
        if (member.maidenName) name += ` (née ${member.maidenName})`;
        return name;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const calculateAge = (birthDate?: string, deathDate?: string) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const end = deathDate ? new Date(deathDate) : new Date();
        const age = Math.floor((end.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age;
    };

    const getMemberById = (id: string) => MOCK_FAMILY_MEMBERS.find(m => m.id === id);

    const handleViewMember = (member: FamilyMember) => {
        setSelectedMember(member);
        setIsDetailModalOpen(true);
    };

    const generationLabels = ['', 'Great-Grandparents', 'Grandparents', 'Parents', 'Children'];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                            <Users className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Family Tree</h1>
                            <p className="text-gray-500 text-sm">Discover and preserve your family's story</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                        className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                        <Info size={18} />
                        <span className="text-sm font-medium">Guide</span>
                        {isGuideExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {isGuideExpanded && (
                    <div className="mt-6 bg-white/70 backdrop-blur rounded-xl p-5 border border-purple-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="text-amber-600" size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-800">Prototype Module</h3>
                                <p className="text-amber-700 text-sm">This is a non-functional mockup showing the planned Genealogy feature. The data displayed is sample data for demonstration purposes only.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Heart className="text-purple-500" size={16} />
                                    What is Family Tree?
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Family Tree helps you discover, document, and share your family's history. Build a comprehensive 
                                    genealogical record spanning generations, complete with photos, stories, and life events. 
                                    Preserve your heritage for future generations to explore and cherish.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <BookOpen className="text-purple-500" size={16} />
                                    How to Use
                                </h3>
                                <ul className="text-gray-600 text-sm space-y-1">
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-500">•</span>
                                        <span>Add family members with birth dates, places, and biographies</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-500">•</span>
                                        <span>Connect relationships (parents, spouses, children)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-500">•</span>
                                        <span>Upload photos and document life events</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-500">•</span>
                                        <span>View your tree visually or as a searchable list</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <GitBranch className="text-purple-500" size={16} />
                                    Connected Modules
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                                        <MapPin size={12} className="mr-1" /> Places
                                    </Badge>
                                    <Badge variant="secondary" className="bg-sky-100 text-sky-700">
                                        <FileText size={12} className="mr-1" /> Documents
                                    </Badge>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                        <Camera size={12} className="mr-1" /> Photos
                                    </Badge>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        <Calendar size={12} className="mr-1" /> Calendar
                                    </Badge>
                                </div>
                                <p className="text-gray-500 text-xs mt-2">
                                    Link birth certificates from Documents, tag locations from Places, and see anniversaries in Calendar.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Star className="text-purple-500" size={16} />
                                    Planned Features
                                </h3>
                                <ul className="text-gray-600 text-sm space-y-1">
                                    <li className="flex items-start gap-2">
                                        <span className="text-gray-400">○</span>
                                        <span>Interactive tree visualization</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-gray-400">○</span>
                                        <span>Map view of family migrations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-gray-400">○</span>
                                        <span>Timeline view across generations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-gray-400">○</span>
                                        <span>DNA/ancestry service integration</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search family members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
                        />
                    </div>
                    <select
                        value={filterGeneration === 'all' ? 'all' : filterGeneration}
                        onChange={(e) => setFilterGeneration(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                        <option value="all">All Generations</option>
                        <option value="1">Generation 1 (Great-Grandparents)</option>
                        <option value="2">Generation 2 (Grandparents)</option>
                        <option value="3">Generation 3 (Parents)</option>
                        <option value="4">Generation 4 (Children)</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'list' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            List View
                        </button>
                        <button
                            onClick={() => setViewMode('tree')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'tree' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Tree View
                        </button>
                    </div>
                    <Button disabled className="opacity-50 cursor-not-allowed">
                        <Plus size={18} className="mr-2" />
                        Add Member
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                    <Users size={16} />
                    {MOCK_FAMILY_MEMBERS.length} members
                </span>
                <span>•</span>
                <span>4 generations</span>
                <span>•</span>
                <span>{MOCK_FAMILY_MEMBERS.filter(m => m.isLiving).length} living</span>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-100">
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Name</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Birth</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">Birthplace</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Generation</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Status</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member, idx) => (
                                <tr 
                                    key={member.id} 
                                    className={`border-b border-gray-50 hover:bg-purple-50/50 transition-colors cursor-pointer ${
                                        idx % 2 === 1 ? 'bg-gray-50/50' : ''
                                    }`}
                                    onClick={() => handleViewMember(member)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                member.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">{member.firstName} {member.lastName}</div>
                                                {member.maidenName && (
                                                    <div className="text-xs text-gray-500">née {member.maidenName}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm hidden md:table-cell">
                                        {member.birthDate ? new Date(member.birthDate).getFullYear() : '—'}
                                        {member.deathDate && ` - ${new Date(member.deathDate).getFullYear()}`}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm hidden lg:table-cell">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={14} className="text-gray-400" />
                                            {member.birthPlace || '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                            Gen {member.generation}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 hidden sm:table-cell">
                                        <Badge variant={member.isLiving ? 'default' : 'secondary'} className={
                                            member.isLiving ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }>
                                            {member.isLiving ? 'Living' : 'Deceased'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewMember(member);
                                            }}
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-8">
                    {[1, 2, 3, 4].map(gen => {
                        const genMembers = MOCK_FAMILY_MEMBERS.filter(m => m.generation === gen);
                        if (genMembers.length === 0) return null;

                        return (
                            <div key={gen} className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                                        {gen}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Generation {gen}</h3>
                                        <p className="text-sm text-gray-500">{generationLabels[gen]}</p>
                                    </div>
                                </div>

                                <div className="relative ml-5 pl-8 border-l-2 border-purple-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {genMembers.map(member => (
                                            <div
                                                key={member.id}
                                                className="relative bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
                                                onClick={() => handleViewMember(member)}
                                            >
                                                <div className="absolute -left-[2.55rem] top-6 w-4 h-4 rounded-full bg-white border-2 border-purple-400 group-hover:bg-purple-400 transition-colors"></div>
                                                
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        member.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        <User size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-gray-800 truncate">
                                                            {member.firstName} {member.lastName}
                                                        </h4>
                                                        {member.maidenName && (
                                                            <p className="text-xs text-gray-500">née {member.maidenName}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <Calendar size={12} />
                                                            {member.birthDate ? new Date(member.birthDate).getFullYear() : '?'}
                                                            {member.deathDate ? ` - ${new Date(member.deathDate).getFullYear()}` : member.isLiving ? ' - Present' : ''}
                                                        </div>
                                                        {member.birthPlace && (
                                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                                <MapPin size={12} />
                                                                <span className="truncate">{member.birthPlace}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-3">
                                                    <Badge variant="secondary" className={
                                                        member.isLiving ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-600 text-xs'
                                                    }>
                                                        {member.isLiving ? 'Living' : 'Deceased'}
                                                    </Badge>
                                                    {member.childrenIds && member.childrenIds.length > 0 && (
                                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                                            {member.childrenIds.length} children
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={selectedMember ? getFullName(selectedMember) : 'Family Member'}
                size="lg"
            >
                {selectedMember && (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 ${
                                selectedMember.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                <User size={40} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-800">{getFullName(selectedMember)}</h2>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Cake size={14} />
                                        {formatDate(selectedMember.birthDate)}
                                    </span>
                                    {selectedMember.deathDate && (
                                        <span className="flex items-center gap-1">
                                            <TreePine size={14} />
                                            {formatDate(selectedMember.deathDate)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className={
                                        selectedMember.isLiving ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }>
                                        {selectedMember.isLiving ? `Living (${calculateAge(selectedMember.birthDate)} years old)` : `Deceased (${calculateAge(selectedMember.birthDate, selectedMember.deathDate)} years)`}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        Generation {selectedMember.generation}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {selectedMember.biography && (
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <BookOpen size={16} className="text-purple-500" />
                                    Biography
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                                    {selectedMember.biography}
                                </p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <MapPin size={16} className="text-purple-500" />
                                    Places
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {selectedMember.birthPlace && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Birthplace</span>
                                            <span className="text-gray-800">{selectedMember.birthPlace}</span>
                                        </div>
                                    )}
                                    {selectedMember.deathPlace && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Death</span>
                                            <span className="text-gray-800">{selectedMember.deathPlace}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <Users size={16} className="text-purple-500" />
                                    Family
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {selectedMember.fatherId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Father</span>
                                            <span className="text-purple-600 cursor-pointer hover:underline">
                                                {getMemberById(selectedMember.fatherId)?.firstName} {getMemberById(selectedMember.fatherId)?.lastName}
                                            </span>
                                        </div>
                                    )}
                                    {selectedMember.motherId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Mother</span>
                                            <span className="text-purple-600 cursor-pointer hover:underline">
                                                {getMemberById(selectedMember.motherId)?.firstName} {getMemberById(selectedMember.motherId)?.lastName}
                                            </span>
                                        </div>
                                    )}
                                    {selectedMember.spouseIds && selectedMember.spouseIds.length > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Spouse</span>
                                            <span className="text-purple-600 cursor-pointer hover:underline">
                                                {getMemberById(selectedMember.spouseIds[0])?.firstName} {getMemberById(selectedMember.spouseIds[0])?.lastName}
                                            </span>
                                        </div>
                                    )}
                                    {selectedMember.childrenIds && selectedMember.childrenIds.length > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Children</span>
                                            <span className="text-gray-800">{selectedMember.childrenIds.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedMember.lifeEvents && selectedMember.lifeEvents.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <Clock size={16} className="text-purple-500" />
                                    Life Events
                                </h3>
                                <div className="space-y-3">
                                    {selectedMember.lifeEvents.map(event => {
                                        const Icon = EVENT_ICONS[event.type] || Star;
                                        return (
                                            <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                    <Icon size={16} className="text-purple-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800">{event.title}</div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                        {event.date && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={12} />
                                                                {formatDate(event.date)}
                                                            </span>
                                                        )}
                                                        {event.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} />
                                                                {event.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                                Close
                            </Button>
                            <Button disabled className="opacity-50 cursor-not-allowed">
                                Edit Member
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default GenealogyView;
