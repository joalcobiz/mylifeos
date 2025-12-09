# LIFEOS - Life Management System

## Overview
LIFEOS (Life Operating System) is a comprehensive personal life management application built with React, TypeScript, Vite, Firebase, and Google Gemini AI. It provides a unified interface for managing various aspects of life including projects, finances, journal entries, places, habits, goals, and more. The project's vision is to offer a robust, multi-user platform for personal organization and productivity, leveraging AI for enhanced insights and automation.

## User Preferences
- **Default Theme:** Light mode with glassmorphism design
- **Mobile Support:** Full responsive design for all screen sizes

## Recent Changes (December 2024)

### Firebase Authentication Migration
- Migrated from custom SHA-256 authentication to Firebase Authentication
- Email/password sign-in, sign-up, and password reset functionality
- First user to sign up automatically becomes Admin/SystemAdmin
- User profiles stored in Firestore `userProfiles` collection

### Security Rules (firestore.rules)
- Per-user data isolation: `users/{userId}/{collection}/{document}`
- Admin users can read any user's data
- Legacy root collections also protected with owner-based access
- Settings collection restricted to admin/system-admin writes only
- Public itinerary sharing: Secure collection-based approach using `publicItineraries/{shareToken}` where the token IS the document ID, preventing unauthorized enumeration

### Performance Optimizations
- Code splitting with React.lazy() for all 16 modules
- Error boundaries wrap all lazy-loaded modules
- ModuleLoader component shows loading state

### TaskStream Urgency System
- UrgencyType values: `today`, `tomorrow`, `dayAfter`, `thisWeek`, `30days`, `date`, `none`
- Color-coded urgency indicators in dashboard

### Tailwind CSS v4 Migration
- Migrated from Tailwind CDN to proper @tailwindcss/vite plugin
- CSS configuration in `src/index.css` with @theme block
- Dynamic theme variables set via App.tsx at runtime

### Mobile Responsiveness (December 2024)
- BottomNav: Redesigned with gradient FAB, active state highlight, safe area padding
- Modal: Mobile-first design with bottom sheet pattern on phones, drag handle indicator
- CSS utilities: Touch target minimums (44px), iOS zoom prevention (16px inputs), safe area helpers
- All module views use responsive grids (grid-cols-2 md:grid-cols-4) and flex layouts

### Firebase Architecture Documentation (December 2024)
- Added comprehensive `FIREBASE_SETUP.md` documentation at project root
- New "Architecture" tab in Settings > Firebase (SystemAdmin only) showing:
  - Data structure diagram (per-user namespacing)
  - Security model and user roles
  - Data flow & caching layers
  - Common issues & solutions
  - Key files for developers

### Data Persistence Fix (December 2024)
- Fixed "data disappears after entry" bug caused by Firestore rejecting `undefined` values
- Added `sanitizeForFirestore()` utility in `services/firestore.ts`
- All Firestore writes now sanitize data to remove undefined values before saving
- Applies to: add, update, and temp-ID fallback operations

### Google Places API Migration (December 2024)
- Migrated from legacy Places API to new Places API (New)
- Three proxy endpoints in vite.config.ts:
  - `/api/places-new:autocomplete` - POST for place autocomplete
  - `/api/places-new/{placeId}` - GET for basic place details (location, address)
  - `/api/places-detailed/{placeId}` - GET for full place details (hours, phone, ratings)
- Updated ItinerariesView.tsx and PlaceForm.tsx to use new API response formats
- API key injected via `X-Goog-Api-Key` header, field masks via `X-Goog-FieldMask`

### User Management Unification (December 2024)
- Fixed discrepancy between Firebase Auth users and Settings > Users section
- Settings now reads from `userProfiles` collection via AuthContext instead of separate `settings.users` array
- Removed "Add User" button - users must sign up themselves via login screen (first user becomes SystemAdmin)
- Added "Refresh" button to reload user list after new sign-ups
- Simplified user edit modal: only role, display name, and theme are editable (credentials managed by Firebase Auth)
- AuthContext now exports: `updateUserProfile()`, `deleteUserProfile()`, `refreshAvailableUsers()`

### Genealogy Module Prototype (December 2024)
- New module: Family tree visualization with 15 mock family members across 4 generations
- Purple/Plum theme (#9333ea) with glassmorphism styling
- Features:
  - Collapsible guide section with "Prototype Module" warning badge
  - List view with search, generation filter, and sortable table
  - Tree view mockup with stacked cards and visual connectors
  - Person detail modal showing biography, life events, relationships
  - Cross-module references to Places, Documents, Photos, Calendar

### Unified ModuleHeader System (December 2024)
- Created reusable `ModuleHeader` component (`components/ModuleHeader.tsx`) with:
  - Collapsible guide sections (like Family Tree and Settings>Sharing)
  - Pastel gradient icon boxes (400-level colors for gentle appearance)
  - Actions slot for module-specific buttons
  - Consistent glassmorphism styling
- Centralized module configuration (`config/moduleGuides.ts`) defining:
  - 16 module keys with title, subtitle, icon, color, and guide sections
  - `getModuleConfig()` and `getIcon()` helper functions
  - Each module has unique gentle color theme
- `ConfiguredModuleHeader` convenience wrapper that auto-loads config by moduleKey
- Applied to all modules: Dashboard, Projects, Financial, Journal, Places, Habits, Goals, Groceries, Purchases, Documents, Loans, Templates, Calendar, Itineraries
- Color palette uses softer 400-level gradients instead of saturated 500-600

### Settings Singleton Pattern Fix (December 2024)
- Fixed 166 duplicate settings documents issue
- Settings now use fixed document ID `user-settings` with upsert pattern
- Added `cleanupDuplicateSettings()` function for maintenance
- Module placement: After Journal in sidebar navigation
- Non-functional: Add/Edit buttons disabled pending backend implementation

## System Architecture
LIFEOS is built with React (TypeScript) and Vite. Styling is handled with Tailwind CSS. The application features a multi-user architecture with role-based access control, data ownership tracking, and selective data sharing capabilities. Key architectural decisions include:

-   **Authentication System:** Firebase Authentication with email/password, session persistence, and admin roles. User profiles stored in Firestore with `isSystemAdmin` flag.
-   **Data Management:** All data stored under `users/{userId}/{collection}` for proper isolation. Legacy collections support owner-based access.
-   **Admin Features:** Admins can view and filter any user's data. Admin views display "from [username]" attribution.
-   **UI/UX:** Responsive design with consistent glassmorphism approach. Professional two-column layouts and compact form components.
-   **Module-based Structure:** 16 feature modules with lazy loading (Projects, Financial, Journal, Places & Events, Habits, Goals, Trips, etc.)
-   **Error Handling:** ErrorBoundary components prevent full-app crashes from individual module failures.
-   **Multi-user Sharing System:** Centralized sharing state with global and per-module settings via SharingContext.
-   **Account System:** Hierarchical workspace structure with AccountContext for management.
-   **Key Features:**
    -   **Projects:** Hierarchical management, AI-generated subtasks, quick notes
    -   **Financial:** Income, expenses, budgets, money flow tracking
    -   **Journal:** Personal entries with AI sentiment analysis
    -   **Places & Events:** Google Maps integrated location management with:
        - List-only view with grouping by Type or City (removed Card/Map views)
        - Search/Manual entry mode toggle in PlaceForm (replaced Quick Draft)
        - Google Places API autocomplete with auto-fill of details
        - Expandable Google Details section (hours, phone, price level)
        - Selection mode for multi-select places with floating action bar
        - "Plan a Visit" (create new trip) and "Add to Existing Itinerary" workflows
        - Events & Best Times tracking for seasonal visits
    -   **Advanced Trip Planner:** Complete itinerary system with:
        - 8 time buckets (Early Morning through Late Night) with gradient-styled pills
        - Streamlined stop form: removed duration, cost, booking URL for less clutter
        - Inline time input with sun icon toggle for fixed vs flexible time modes
        - Compact one-line stops display grouped by days during creation
        - Status change confirmations when moving to/from Completed status
        - Auto "Unplanned" status for trips without dates
        - Helpful on-screen instructions in empty state
        - Collapsible day sections with inline progress indicators
        - Manual location entry + Google Places autocomplete toggle
        - Lazy-loaded map previews per stop
        - Drag-and-drop reordering within days
        - Public sharing with unique tokens (`/share/:tripId?token=xxx`)
        - Elegant compact PDF export with dynamic row heights
        - Trip themes (default, tropical, adventure, city, beach, mountain)
    -   **Habits & Goals:** Tracking with visualizations
    -   **Action Center Dashboard:** Redesigned comprehensive dashboard with:
        - Personalized greeting header with date and quick stats (streak, tasks today, upcoming trips)
        - "On This Day" carousel showing memories from years past (trips, journal entries, places visited, family events)
        - Quick capture input for fast task/note entry
        - This Week stats grid (Tasks Done, Habits %, Journal Entries, Money Spent)
        - Collapsible sections: Overdue (red), Today (orange), Upcoming (blue), For You (purple)
        - Module-specific action buttons (Complete, View, Update, Write)
        - All sections respect sharing/permission filters
    -   **Multiple Grocery Lists:** Color-coded, customizable lists
    -   **User Deletion:** Three options - delete all, transfer ownership, keep shared

## External Dependencies
-   **Firebase:** Firestore (NoSQL database), Authentication (email/password), Storage (media files)
-   **Google Maps Places API:** Place search and details, secured via Vite proxy
-   **Google Gemini API:** AI-powered features (sentiment analysis, subtask generation)
-   **Lucide React:** Icons
-   **Leaflet.js with MarkerCluster:** Map functionalities

## Planned Features

### Access Level Legend
- **SystemAdmin**: Platform owner/developer only
- **GroupAdmin**: Group/family administrators
- **AllUsers**: All authenticated users

| Feature Name | Explanation | Module | Access | Images | Complexity | ETA |
|-------------|-------------|--------|--------|--------|------------|-----|
| Action Center Dashboard | Redesign Dashboard as comprehensive action hub with collapsible sections for Tasks, Habits, Goals, Financial summaries, and individual module cards | Dashboard | AllUsers | `attached_assets/image_1765247634260.png` | High | TBD |
| *Add more features below* | | | | | | |

### Action Center Dashboard - Detailed Specification

**Header Section:**
- Personalized greeting with date and weather icon
- Quick stats bar: streak count, tasks today, events count, birthday/anniversary reminders

**Main Layout (Two Columns):**

**Left Column - Action Center:**
Collapsible sections organized by urgency/category:
1. **On This Day** (Orange) - Family history events, past memories/journal entries, "View History" link
2. **Overdue** (Red badge) - Past-due items with "Complete" buttons
3. **Today** (Orange badge) - Current day items with contextual action buttons (Call, Join, View List, Pay Now, Log Now, Review, Write)
4. **Upcoming** (Blue badge) - Future items with "View" buttons
5. **For You** (Purple badge) - AI-suggested actions, reminders to revisit places, goal check-ins
6. **Family Activity** (Teal badge) - Recent actions by group members with "View" buttons

**Right Column - Widgets:**
1. **This Week Stats** - Grid showing: Tasks Done, Habits %, Journal Entries, Money Spent
2. **Needs Attention** - Alert items requiring action (expiring docs, wishlist items, incomplete profiles)
3. **Recent Activity** - Module activity summaries (Projects active/completed, Financial status, Family Tree members, Trips countdown)

**Features:**
- Each action item shows: module icon (color-coded), title, description, source module, timestamp, and contextual action buttons
- View toggle: "Timeline | Category | Module" tabs
- Layout toggle: "Separate | Combined" for sidebar position
- All sections are collapsible with item count badges
- Responsive design for mobile

---

## Key Files
- `FIREBASE_SETUP.md` - Comprehensive Firebase architecture documentation for developers
- `services/firebase.ts` - Firebase initialization
- `services/firestore.ts` - Firestore CRUD operations with optimistic updates and `sanitizeForFirestore()` utility
- `contexts/AuthContext.tsx` - Authentication state management
- `firestore.rules` - Firestore security rules
- `components/ErrorBoundary.tsx` - Error handling wrapper
- `components/ModuleLoader.tsx` - Lazy loading spinner
- `components/TaskStream.tsx` - Dashboard task aggregation
- `modules/Itineraries/ItinerariesView.tsx` - Advanced trip planner with all features
- `modules/Itineraries/PublicItineraryView.tsx` - Read-only public share view
- `utils/pdfItinerary.ts` - Shared PDF export utility with theme-aware styling and consistent sorting
