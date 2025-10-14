# Financial Dashboard - Awentia Bilanci

## Overview

Awentia Bilanci is a financial dashboard application for analyzing company balance sheets and income statements. The system provides comprehensive KPI tracking, interactive charts, and detailed financial reports for Awentia Srl. It displays financial data across multiple views including detailed and summary profit & loss statements with monthly breakdowns and year-over-year comparisons.

The application is built as a modern single-page application with a focus on data clarity and professional presentation of financial information.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Charts**: Chart.js for data visualization

**Design System**: Custom financial dashboard design inspired by modern SaaS applications (Linear, Stripe, Notion). The design prioritizes data clarity over visual flair, using a neutral color palette with indigo as the primary brand color. The system uses CSS variables for theming with support for light/dark modes.

**Component Structure**:
- Reusable financial components (KPICard, DataTable, ChartCard, InfoBox, PageHeader)
- Shared UI components from Shadcn/ui library
- Custom sidebar navigation with gradient background
- Responsive layout with fixed sidebar (280px) on desktop

**Key Pages**:
- Dashboard: Overview with KPIs and trends
- CE Dettaglio: Detailed profit & loss statement
- CE Dettaglio Mensile: Monthly detailed P&L
- CE Sintetico: Summary P&L statement
- CE Sintetico Mensile: Monthly summary P&L

### Backend Architecture

**Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints (currently minimal implementation)
- **Development Server**: Vite middleware integration for hot module replacement
- **Build**: esbuild for production bundling

**Storage Layer**: Currently using in-memory storage with interface-based design for future database integration. The storage interface supports basic CRUD operations for users.

**Session Management**: Placeholder for connect-pg-simple (PostgreSQL session store) - currently not fully implemented.

### Data Storage Solutions

**Database ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Migration Tool**: Drizzle Kit
- **Database Provider**: Neon Database serverless driver (@neondatabase/serverless)

**Current Schema**: Basic users table with UUID primary keys. The application is structured to support PostgreSQL but currently uses in-memory storage for development.

**Data Strategy**: Financial data is currently hardcoded in `client/src/data/financialData.ts` containing comprehensive P&L data for 2024-2025 comparison and monthly trends.

### Authentication & Authorization

**Current State**: Basic user schema defined but authentication not fully implemented. The storage layer has methods for user creation and retrieval by username/ID.

**Planned Approach**: User-based authentication with session management through PostgreSQL session store.

### Build & Development Tools

**Development**:
- Vite for fast development builds and HMR
- tsx for TypeScript execution
- Custom Vite plugins for Replit integration (cartographer, dev-banner, runtime-error-modal)

**Production**:
- Vite for frontend bundling (outputs to dist/public)
- esbuild for backend bundling (outputs to dist)
- Static file serving in production mode

**Path Aliases**:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

**Type Safety**: Strict TypeScript configuration with comprehensive type checking across client, server, and shared code.

## External Dependencies

### UI & Styling
- **Radix UI**: Complete set of accessible, unstyled UI primitives (@radix-ui/react-*)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: For component variant management
- **tailwind-merge & clsx**: For conditional class name composition

### Data Visualization
- **Chart.js**: Canvas-based charting library for financial graphs
- **react-chartjs-2**: React wrapper for Chart.js

### Forms & Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library
- **drizzle-zod**: Drizzle ORM to Zod schema converter

### Database & ORM
- **Drizzle ORM**: TypeScript ORM for SQL databases
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **Drizzle Kit**: Migration and schema management tool

### State Management
- **TanStack Query**: Server state management and caching

### Routing
- **Wouter**: Minimalist routing library for React

### Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **cmdk**: Command menu component