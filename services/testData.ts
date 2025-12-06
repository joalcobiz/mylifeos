import { collection, writeBatch, doc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { 
    ProjectItem, FinancialItem, Place, JournalEntry, Loan, 
    Purchase, GroceryItem, Itinerary, Template 
} from '../types';

const getRandomDate = (startDays: number, endDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * (endDays - startDays + 1) + startDays));
    return date.toISOString().split('T')[0];
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateUniqueId = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const saveToLocalStorage = (userId: string, collectionName: string, items: any[]) => {
    const storageKey = `lifeos-${userId}-${collectionName}`;
    const existing = localStorage.getItem(storageKey);
    const existingData = existing ? JSON.parse(existing) : [];
    const merged = [...existingData, ...items];
    localStorage.setItem(storageKey, JSON.stringify(merged));
};

const clearFromLocalStorage = (userId: string, collectionName: string) => {
    const storageKey = `lifeos-${userId}-${collectionName}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) {
        const data = JSON.parse(existing);
        const filtered = data.filter((item: any) => !item.isTestData);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
        return data.length - filtered.length;
    }
    return 0;
};

const USERS = ['Alexander', 'Vanessa'];

export const generateTestData = async (userId: string, isDemo: boolean = false) => {
    const createId = generateUniqueId;
    const currentUserName = userId === 'user-alexander' ? 'Alexander' : 'Vanessa';
    const otherUserName = currentUserName === 'Alexander' ? 'Vanessa' : 'Alexander';
    
    console.log("Starting Test Data Generation for:", userId, isDemo ? "(Demo Mode)" : "(Firebase Mode)");

    const allData: Record<string, any[]> = {
        places: [],
        projects: [],
        financial: [],
        journal: [],
        loans: [],
        itineraries: [],
        purchases: [],
        groceries: [],
        habits: [],
        goals: [],
        documents: [],
        collections: []
    };

    const placeNames: string[] = [];

    const placesRaw = [
        { name: "Joe's Pizza", type: "Restaurant", city: "New York", state: "NY", rating: 5, address: "7 Carmine St", collections: ["Foodie", "Must Visit"] },
        { name: "Central Park", type: "Park", city: "New York", state: "NY", rating: 5, address: "Manhattan", collections: ["Nature"] },
        { name: "Blue Bottle Coffee", type: "Cafe", city: "San Francisco", state: "CA", rating: 4, address: "66 Mint Plaza", collections: ["Coffee"] },
        { name: "Powell's City of Books", type: "Shop", city: "Portland", state: "OR", rating: 5, address: "1005 W Burnside St", collections: ["Books", "Shopping"] },
        { name: "The Louvre", type: "Museum", city: "Paris", state: "France", rating: 5, address: "Rue de Rivoli", collections: ["Art", "Travel"] },
        { name: "Eiffel Tower", type: "Landmark", city: "Paris", state: "France", rating: 4, address: "Champ de Mars", collections: ["Travel"] },
        { name: "Cafe Du Monde", type: "Cafe", city: "New Orleans", state: "LA", rating: 5, address: "800 Decatur St", collections: ["Foodie"] },
        { name: "Griffith Observatory", type: "Museum", city: "Los Angeles", state: "CA", rating: 5, address: "2800 E Observatory Rd", collections: ["Views"] },
        { name: "Pike Place Market", type: "Shop", city: "Seattle", state: "WA", rating: 4, address: "85 Pike St", collections: ["Foodie"] },
        { name: "Grand Canyon", type: "Park", city: "Arizona", state: "AZ", rating: 5, address: "Grand Canyon Village", collections: ["Nature"] },
        { name: "Tate Modern", type: "Museum", city: "London", state: "UK", rating: 4, address: "Bankside", collections: ["Art"] },
        { name: "Shinjuku Gyoen", type: "Park", city: "Tokyo", state: "Japan", rating: 5, address: "11 Naitomachi", collections: ["Nature", "Travel"] },
        { name: "Tsukiji Outer Market", type: "Shop", city: "Tokyo", state: "Japan", rating: 4, address: "4 Chome-13 Tsukiji", collections: ["Foodie"] },
        { name: "Bondi Beach", type: "Park", city: "Sydney", state: "Australia", rating: 5, address: "Bondi Beach, NSW", collections: ["Beach"] },
        { name: "Sydney Opera House", type: "Landmark", city: "Sydney", state: "Australia", rating: 5, address: "Bennelong Point", collections: ["Art"] },
        { name: "Colosseum", type: "Landmark", city: "Rome", state: "Italy", rating: 5, address: "Piazza del Colosseo", collections: ["History"] },
        { name: "Vatican Museums", type: "Museum", city: "Vatican City", state: "Vatican", rating: 5, address: "Viale Vaticano", collections: ["Art", "History"] },
        { name: "Sagrada Familia", type: "Landmark", city: "Barcelona", state: "Spain", rating: 5, address: "Carrer de Mallorca", collections: ["Architecture"] },
        { name: "Park Guell", type: "Park", city: "Barcelona", state: "Spain", rating: 4, address: "08024 Barcelona", collections: ["Views"] },
        { name: "Machu Picchu", type: "Landmark", city: "Cusco", state: "Peru", rating: 5, address: "Machu Picchu", collections: ["History", "Travel"] },
    ];

    placesRaw.forEach(p => {
        const id = createId();
        placeNames.push(p.name);
        allData.places.push({ 
            ...p, 
            id, 
            visitedCount: Math.floor(Math.random() * 5), 
            lat: 40 + Math.random() * 10,
            lng: -70 - Math.random() * 10,
            isTestData: true 
        });
    });

    const projectsData = [
        { name: "Home Renovation", creator: 'Alexander', assignee: 'Alexander' },
        { name: "Learn Spanish", creator: 'Vanessa', assignee: 'Vanessa' },
        { name: "Q3 Business Goals", creator: 'Alexander', assignee: 'Vanessa' },
        { name: "Website Redesign", creator: 'Alexander', assignee: 'Alexander' },
        { name: "Trip to Japan Planning", creator: 'Vanessa', assignee: 'Alexander' },
        { name: "Fitness Journey", creator: 'Vanessa', assignee: 'Vanessa' },
        { name: "Write Book", creator: 'Alexander', assignee: 'Alexander' },
        { name: "Garden Setup", creator: 'Vanessa', assignee: 'Vanessa' },
        { name: "Financial Cleanup", creator: 'Alexander', assignee: 'Vanessa' },
        { name: "Wedding Planning", creator: 'Vanessa', assignee: 'Alexander' },
    ];
    
    const statuses = ['In Progress', 'Not Started', 'Completed', 'On Hold'];

    projectsData.forEach(proj => {
        const projId = createId();
        const createdDate = getRandomDate(-60, -10);
        const dueDate = getRandomDate(10, 90);
        
        const subtasks: any[] = [];
        for(let i=0; i<4; i++) {
            const subId = `sub-${projId}-${i}`;
            const subAssignee = i % 2 === 0 ? proj.assignee : (proj.assignee === 'Alexander' ? 'Vanessa' : 'Alexander');
            subtasks.push({
                id: subId,
                type: 'task',
                name: `${proj.name} - Phase ${i+1}`,
                status: getRandomItem(statuses),
                priority: getRandomItem(['High', 'Medium', 'Low']),
                dueDate: getRandomDate(0, 30),
                createdDate: createdDate,
                creator: proj.creator,
                assignee: subAssignee,
                progress: Math.floor(Math.random() * 100),
                subtasks: [],
                notes: [],
                parentPath: [proj.name],
                isTestData: true
            });
        }

        allData.projects.push({
            id: projId,
            type: 'project',
            name: proj.name,
            description: `Auto-generated project plan for ${proj.name}.`,
            status: getRandomItem(statuses),
            priority: getRandomItem(['High', 'Medium']),
            dueDate: dueDate,
            createdDate: createdDate,
            creator: proj.creator,
            assignee: proj.assignee,
            progress: Math.floor(Math.random() * 100),
            subtasks: subtasks,
            parentPath: [],
            isArchived: false,
            isQuickNotes: false,
            isTestData: true
        });
    });

    const quickNotesData = [
        { name: "Research new CRM tools", creator: currentUserName },
        { name: "Call insurance company about policy", creator: currentUserName },
        { name: "Buy birthday gift for mom", creator: currentUserName },
        { name: "Explore meal prep services", creator: currentUserName },
    ];

    quickNotesData.forEach(note => {
        const id = createId();
        allData.projects.push({
            id,
            type: 'task',
            name: note.name,
            description: '',
            status: 'Not Started',
            priority: 'Medium',
            creator: note.creator,
            assignee: note.creator,
            dueDate: '',
            createdDate: new Date().toISOString(),
            progress: 0,
            subtasks: [],
            notes: [],
            parentPath: [],
            isQuickNotes: true,
            isTestData: true
        });
    });

    const financialDescs = ["Salary", "Rent", "Groceries", "Netflix", "Spotify", "Gym Membership", "Freelance Project", "Dinner Out", "Uber", "Electric Bill", "Internet", "Coffee Run", "New Shoes", "Flight Tickets", "Hotel Booking", "Dividend", "Bonus", "Car Insurance", "Gas", "Phone Bill", "Amazon Purchase", "Cinema", "Drinks", "Gift", "Charity"];
    
    financialDescs.forEach((desc, i) => {
        const id = createId();
        const type = i % 5 === 0 ? 'income' : 'expense';
        const amount = type === 'income' ? (Math.random() * 3000 + 1000) : (Math.random() * 200 + 10);
        
        allData.financial.push({
            id,
            type,
            description: desc,
            amount: Math.floor(amount),
            currency: getRandomItem(['USD', 'EUR', 'GBP']),
            isEnabled: true,
            frequency: i < 5 ? 'Monthly' : 'One-Time',
            owner: getRandomItem(USERS),
            dueDay: Math.floor(Math.random() * 28) + 1,
            category: type === 'income' ? 'Salary' : getRandomItem(['Housing', 'Food', 'Transport', 'Entertainment', 'Utilities']),
            account: 'Chase Checking',
            isTestData: true
        });
    });

    for(let i=0; i<20; i++) {
        const id = createId();
        const date = getRandomDate(-30, 0);
        const place = i % 3 === 0 ? getRandomItem(placeNames) : undefined;
        
        allData.journal.push({
            id,
            title: place ? `Visited ${place}` : `Daily Reflection ${i+1}`,
            body: place ? `Went to ${place} today. It was amazing. The atmosphere was great.` : `Today was a good day. Worked on the project and made progress.`,
            date,
            mood: getRandomItem(['Happy', 'Calm', 'Productive', 'Tired', 'Excited']),
            tags: place ? ['Travel', 'Place'] : ['Personal', 'Work'],
            location: place,
            author: getRandomItem(USERS),
            isTestData: true
        });
    }

    const loanNames = ["Mortgage", "Car Loan", "Student Loan", "Personal Loan to Bob", "Credit Card Debt", "Business Loan", "Loan from Dad", "Furniture Financing", "Lent to Sarah", "Medical Bill"];
    loanNames.forEach((name, i) => {
        const id = createId();
        const category = i % 3 === 0 ? 'Owed To Me' : 'I Owe';
        allData.loans.push({
            id,
            category,
            name,
            type: 'Personal',
            lender: category === 'I Owe' ? 'Bank' : 'Friend',
            borrower: category === 'Owed To Me' ? 'Friend' : 'Me',
            originalAmount: Math.floor(Math.random() * 10000 + 1000),
            remainingAmount: Math.floor(Math.random() * 5000 + 500),
            interestRate: Math.floor(Math.random() * 10) + 2,
            startDate: getRandomDate(-365, -30),
            dueDate: getRandomDate(30, 365),
            payments: [],
            notes: `Auto-generated loan: ${name}`,
            owner: getRandomItem(USERS),
            isTestData: true
        });
    });

    const itineraryData = [
        { title: "Paris Adventure", destination: "Paris, France", startDate: getRandomDate(30, 45), endDate: getRandomDate(45, 60), creator: 'Alexander' },
        { title: "Tokyo Exploration", destination: "Tokyo, Japan", startDate: getRandomDate(60, 90), endDate: getRandomDate(90, 105), creator: 'Vanessa' },
        { title: "NYC Weekend", destination: "New York, USA", startDate: getRandomDate(14, 21), endDate: getRandomDate(21, 28), creator: 'Alexander' },
    ];

    itineraryData.forEach(itin => {
        const id = createId();
        allData.itineraries.push({
            id,
            title: itin.title,
            destination: itin.destination,
            startDate: itin.startDate,
            endDate: itin.endDate,
            status: 'Planned',
            notes: `Auto-generated itinerary for ${itin.destination}`,
            creator: itin.creator,
            days: [
                { id: `day-${id}-1`, date: itin.startDate, activities: [{ id: `act-${id}-1`, time: '10:00', title: 'Arrival & Check-in', location: 'Hotel', notes: '' }] },
                { id: `day-${id}-2`, date: itin.endDate, activities: [{ id: `act-${id}-2`, time: '14:00', title: 'Departure', location: 'Airport', notes: '' }] },
            ],
            isTestData: true
        });
    });

    const purchaseItems = [
        { name: "MacBook Pro", store: "Apple Store", assignee: 'Alexander' },
        { name: "iPhone 15", store: "Apple Store", assignee: 'Vanessa' },
        { name: "Sony Camera", store: "Best Buy", assignee: 'Alexander' },
        { name: "Nintendo Switch", store: "GameStop", assignee: 'Vanessa' },
        { name: "Dyson Vacuum", store: "Amazon", assignee: 'Alexander' },
        { name: "Coffee Machine", store: "Williams Sonoma", assignee: 'Vanessa' },
        { name: "Espresso Maker", store: "Sur La Table", assignee: 'Alexander' },
        { name: "Smart Watch", store: "Best Buy", assignee: 'Vanessa' },
        { name: "Headphones", store: "Amazon", assignee: 'Alexander' },
        { name: "Kindle", store: "Amazon", assignee: 'Vanessa' },
        { name: "iPad", store: "Apple Store", assignee: 'Alexander' },
        { name: "Monitor", store: "Best Buy", assignee: 'Vanessa' },
        { name: "Keyboard", store: "Amazon", assignee: 'Alexander' },
        { name: "Mouse", store: "Amazon", assignee: 'Vanessa' },
        { name: "Webcam", store: "Best Buy", assignee: 'Alexander' },
        { name: "Microphone", store: "Guitar Center", assignee: 'Vanessa' },
        { name: "Standing Desk", store: "IKEA", assignee: 'Alexander' },
        { name: "Office Chair", store: "Herman Miller", assignee: 'Vanessa' },
        { name: "Bookshelf", store: "IKEA", assignee: 'Alexander' },
        { name: "Lamp", store: "Target", assignee: 'Vanessa' }
    ];
    
    purchaseItems.forEach((item, i) => {
        const id = createId();
        allData.purchases.push({
            id,
            itemName: item.name,
            store: item.store,
            status: getRandomItem(['Researching', 'Decided', 'Purchased', 'Wishlist']),
            priority: getRandomItem(['High', 'Medium', 'Low']),
            urgency: getRandomItem(['Just Curious', 'Would Like', 'Must Have']),
            budget: Math.floor(Math.random() * 2000 + 100),
            category: i < 10 ? 'Electronics' : 'Home',
            notes: `Auto-generated shopping item: ${item.name}`,
            dateAdded: getRandomDate(-30, 0),
            owner: item.assignee,
            isTestData: true
        });
    });

    const groceryList = ["Milk", "Eggs", "Bread", "Cheese", "Apples", "Bananas", "Chicken", "Beef", "Rice", "Pasta", "Tomato Sauce", "Onions", "Garlic", "Butter", "Yogurt", "Cereal", "Coffee", "Tea", "Sugar", "Flour"];
    groceryList.forEach((item, i) => {
        const id = createId();
        allData.groceries.push({
            id,
            name: item,
            category: i < 5 ? 'Dairy' : i < 10 ? 'Produce' : 'Pantry',
            completed: i % 2 === 0,
            isHistory: false,
            addedBy: getRandomItem(USERS),
            isTestData: true
        });
    });

    const habitNames = ["Morning Exercise", "Read Daily", "Meditate", "Drink Water", "Learn Spanish", "Journal", "No Social Media", "Sleep 8 Hours"];
    habitNames.forEach((name) => {
        const id = createId();
        const startDate = getRandomDate(-60, -30);
        allData.habits.push({
            id,
            name,
            description: `Auto-generated habit: ${name}`,
            frequency: getRandomItem(['Daily', 'Weekly']),
            category: getRandomItem(['Health', 'Productivity', 'Learning', 'Wellness']),
            icon: '✓',
            color: getRandomItem(['#ea580c', '#2563eb', '#7c3aed', '#059669']),
            startDate,
            streak: Math.floor(Math.random() * 45),
            owner: getRandomItem(USERS),
            history: Array.from({ length: Math.floor(Math.random() * 30) }, (_, idx) => {
                const d = new Date(startDate);
                d.setDate(d.getDate() + idx);
                return d.toISOString().split('T')[0];
            }),
            isTestData: true
        });
    });

    const goalNames = ["Fitness Goal", "Learn New Language", "Save $10,000", "Complete Book", "Launch Project"];
    goalNames.forEach((name) => {
        const id = createId();
        allData.goals.push({
            id,
            name,
            description: `Auto-generated goal: ${name}`,
            category: getRandomItem(['Health', 'Learning', 'Financial', 'Personal', 'Career']),
            priority: getRandomItem(['High', 'Medium', 'Low']),
            startDate: getRandomDate(-30, 0),
            deadline: getRandomDate(30, 180),
            progress: Math.floor(Math.random() * 100),
            status: getRandomItem(['In Progress', 'Not Started', 'Completed']),
            owner: getRandomItem(USERS),
            milestones: [
                { id: `m1-${id}`, title: `Milestone 1 for ${name}`, completed: Math.random() > 0.5, dueDate: getRandomDate(10, 60) },
                { id: `m2-${id}`, title: `Milestone 2 for ${name}`, completed: false, dueDate: getRandomDate(60, 120) }
            ],
            isTestData: true
        });
    });

    const docTitles = ["Insurance Policy", "Medical Records", "Birth Certificate", "Passport Copy", "Tax Return 2023", "Investment Summary", "Home Deed", "Car Title", "Rental Agreement", "Warranty Info"];
    const docCategories = ['Insurance', 'Medical', 'Personal', 'Legal', 'Financial', 'Education', 'Work', 'Home', 'Other'];
    docTitles.forEach((title, i) => {
        const id = createId();
        allData.documents.push({
            id,
            title,
            type: getRandomItem(['file', 'note', 'link']),
            category: docCategories[i % docCategories.length],
            tags: [getRandomItem(['Important', 'Review', 'Archive', 'Verify'])],
            dateAdded: getRandomDate(-90, 0),
            dateModified: getRandomDate(-30, 0),
            content: `Auto-generated document: ${title}. This is a test document entry.`,
            starred: Math.random() > 0.7,
            owner: getRandomItem(USERS),
            isTestData: true
        });
    });

    const bookColId = createId();
    allData.collections.push({
        id: bookColId,
        name: "Test Library",
        type: "Books",
        category: "Media",
        description: "My generated test books",
        fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'author', label: 'Author', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: ['Read', 'Unread'] }],
        items: [
            { id: 'b1', title: "Dune", author: "Frank Herbert", status: "Read" },
            { id: 'b2', title: "The Hobbit", author: "J.R.R. Tolkien", status: "Read" },
            { id: 'b3', title: "Project Hail Mary", author: "Andy Weir", status: "Unread" },
            { id: 'b4', title: "1984", author: "George Orwell", status: "Read" },
            { id: 'b5', title: "Atomic Habits", author: "James Clear", status: "Read" },
        ],
        isTestData: true
    });

    if (isDemo) {
        Object.entries(allData).forEach(([colName, items]) => {
            if (items.length > 0) {
                saveToLocalStorage(userId, colName, items);
                console.log(`Saved ${items.length} items to localStorage: ${colName}`);
            }
        });
    } else {
        try {
            const batch = writeBatch(db);
            
            Object.entries(allData).forEach(([colName, items]) => {
                items.forEach(item => {
                    const ref = doc(db, 'users', userId, colName, item.id);
                    batch.set(ref, item);
                });
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Firebase batch failed, falling back to localStorage:", error);
            Object.entries(allData).forEach(([colName, items]) => {
                if (items.length > 0) {
                    saveToLocalStorage(userId, colName, items);
                }
            });
        }
    }
    
    console.log("Test Data Generation Complete.");
};

export const clearTestData = async (userId: string, isDemo: boolean = false) => {
    console.log("Clearing Test Data for:", userId, isDemo ? "(Demo Mode)" : "(Firebase Mode)");
    
    const collectionsList = ['projects', 'financial', 'journal', 'loans', 'places', 'itineraries', 'purchases', 'groceries', 'collections', 'documents', 'habits', 'goals'];
    
    if (isDemo) {
        let totalCleared = 0;
        collectionsList.forEach(colName => {
            const cleared = clearFromLocalStorage(userId, colName);
            totalCleared += cleared;
            if (cleared > 0) {
                console.log(`Cleared ${cleared} items from localStorage: ${colName}`);
            }
        });
        console.log(`Cleanup Complete. Total cleared: ${totalCleared}`);
        return;
    }
    
    try {
        const promises = collectionsList.map(async (colName) => {
            const colRef = collection(db, 'users', userId, colName);
            const q = query(colRef, where('isTestData', '==', true));
            const snapshot = await getDocs(q);
            
            const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            console.log(`Cleared ${snapshot.size} items from ${colName}`);
        });

        await Promise.all(promises);
    } catch (error) {
        console.error("Firebase cleanup failed, falling back to localStorage:", error);
        collectionsList.forEach(colName => {
            clearFromLocalStorage(userId, colName);
        });
    }
    
    console.log("Cleanup Complete.");
};
