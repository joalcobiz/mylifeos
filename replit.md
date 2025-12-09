# LIFEOS - Life Management System

## Overview
LIFEOS (Life Operating System) is a comprehensive personal life management application built with React, TypeScript, Vite, Firebase, and Google Gemini AI. It provides a unified interface for managing various aspects of life including projects, finances, journal entries, places, habits, goals, and more. The project's vision is to offer a robust, multi-user platform for personal organization and productivity, leveraging AI for enhanced insights and automation.

## User Preferences
- **Default Theme:** Light mode with glassmorphism design
- **Mobile Support:** Full responsive design for all screen sizes

## System Architecture
LIFEOS is built with React (TypeScript) and Vite, utilizing Tailwind CSS for styling. It features a multi-user architecture with role-based access control, data ownership tracking, and selective data sharing capabilities.

### UI/UX Decisions
- **Design System:** Consistent glassmorphism approach with professional two-column layouts and compact form components.
- **Responsiveness:** Full responsive design, including mobile-first modals (bottom sheets), responsive grids, and touch target considerations.
- **ModuleHeader System:** Reusable `ModuleHeader` component with collapsible guide sections, pastel gradient icon boxes, and module-specific action slots, centrally configured for 16 modules with unique gentle color themes.
- **Dashboard:** Redesigned with a white page background, colored section tints, a dark gradient header, a "On This Day" carousel, collapsible sections (Overdue, Today, Upcoming, For You, Family Activity), and module cards.

### Technical Implementations
- **Authentication:** Firebase Authentication for email/password sign-in, sign-up, and password reset, with the first user becoming Admin/SystemAdmin. User profiles are stored in Firestore.
- **Data Management:** All user-specific data is stored under `users/{userId}/{collection}` for isolation. Settings are managed using a singleton pattern with a fixed document ID (`user-settings`).
- **Performance:** Code splitting with `React.lazy()` for all 16 modules, wrapped in `ErrorBoundary` components for fault tolerance.
- **Firestore Data Sanitization:** `sanitizeForFirestore()` utility ensures `undefined` values are removed from data before Firestore writes, preventing data loss.
- **User Management Unification:** User profiles are read from the `userProfiles` collection via `AuthContext`, unifying user data management.

### Feature Specifications
- **Projects:** Hierarchical management with AI-generated subtasks and quick notes.
- **Financial:** Income, expenses, budgets, and money flow tracking.
- **Journal:** Personal entries with AI sentiment analysis.
- **Places & Events:** Google Maps integrated location management with a list-only view, search/manual entry, Google Places API autocomplete, expandable Google Details, selection mode, "Plan a Visit" and "Add to Existing Itinerary" workflows, and Events & Best Times tracking.
- **Advanced Trip Planner:** Complete itinerary system with 8 time buckets, streamlined stop forms, inline time input, compact one-line stops display, status change confirmations, auto "Unplanned" status, collapsible day sections, manual location entry + Google Places autocomplete, lazy-loaded map previews, drag-and-drop reordering, public sharing with unique tokens, and compact PDF export with dynamic row heights.
- **Habits & Goals:** Tracking with visualizations.
- **TaskStream:** Urgency system with `UrgencyType` values and color-coded indicators.
- **Genealogy Module (Prototype):** Family tree visualization with mock members, list and tree views, person detail modals, and cross-module references.
- **Security Rules:** Per-user data isolation, admin read access, and secure public itinerary sharing.

## External Dependencies
-   **Firebase:** Firestore (NoSQL database), Authentication (email/password), Storage (media files).
-   **Google Maps Places API:** Place search and details, secured via Vite proxy.
-   **Google Gemini API:** AI-powered features (sentiment analysis, subtask generation).
-   **Lucide React:** Icons.
-   **Leaflet.js with MarkerCluster:** Map functionalities.