# BioBillingPro

## Overview

BioBillingPro is a practice management application designed for biokineticists. It enables session tracking, patient management, billing code management, and revenue reporting. The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, Zustand for client state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite

The frontend is a single-page application with four main pages:

- Dashboard (revenue stats and charts using Recharts)
- Sessions (session capture and management)
- Patients (patient records)
- Admin (user management, billing codes, data export)

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: RESTful JSON API under `/api/`* routes
- **File Uploads**: Multer for Excel file imports

The server handles all API routes in `server/routes.ts` and uses a storage abstraction layer in `server/storage.ts` for database operations.

### Data Storage

- **Database**: PostgreSQL accessed via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions and Zod validation schemas
- **Core Entities**:
  - Users (practitioners and admins)
  - Patients (client records with medical aid info)
  - Billing Codes (procedure codes with pricing, supports medical aid vs private rates)
  - Sessions (appointment records linking practitioners, patients, and billing codes)

### Development vs Production

- Development: Vite dev server with HMR, Express API runs concurrently
- Production: Vite builds static assets to `dist/public`, Express serves them via `server/static.ts`

## External Dependencies

### Database

- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle Kit for schema migrations (`npm run db:push`)

### Third-Party Services

- None currently integrated, though the build script includes allowlisted dependencies for future integrations (Stripe, OpenAI, Nodemailer, etc.)

### Key NPM Packages

- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Async state management
- `xlsx`: Excel file parsing for billing code imports
- `date-fns`: Date formatting and manipulation
- `recharts`: Dashboard charts
- Full shadcn/ui component suite via Radix UI primitives

