# Smile Stars India - Dental Care Platform

## Overview

Smile Stars India is a comprehensive web application designed to streamline preventive dental care camps for school children. The platform manages the complete workflow from school registration and camp scheduling to student screening and report generation. The application uses a modern full-stack architecture with React frontend, Node.js/Express backend, and PostgreSQL database.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Email Service**: Nodemailer for report delivery and notifications
- **Session Management**: PostgreSQL session store with connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Migrations**: Drizzle Kit for schema migrations
- **Session Storage**: PostgreSQL-based session management

## Key Components

### Authentication & Authorization
- Role-based access control (admin, dentist, school_admin, parent)
- JWT token-based authentication
- Protected routes with middleware verification
- User session management with database persistence

### School Management
- School registration and profile management
- Contact person and administrative details
- Geographic location tracking (city, state, pincode)
- School admin user association

### Camp Management
- Dental camp scheduling with date ranges
- School assignment and dentist allocation
- Expected student count planning
- Status tracking (planned, active, completed)

### Student Registration
- Student demographic data collection
- Camp association and enrollment
- Parent contact information management
- Academic details (grade, roll number)

### Dental Screening System
- Interactive dental chart component for tooth marking
- Digital screening forms based on clinical examination protocols
- Tooth condition tracking (healthy, decayed, missing, filled, crowned)
- Clinical findings documentation

### Reporting System
- PDF report generation using jsPDF
- Parent communication via email
- Report preview and download functionality
- Historical report tracking

## Data Flow

1. **School Registration**: Admins register schools with contact details
2. **Camp Planning**: Camps are scheduled for registered schools with assigned dentists
3. **Student Enrollment**: Students are registered during active camps
4. **Dental Screening**: Dentists conduct examinations using digital forms
5. **Report Generation**: Automated reports are created and sent to parents
6. **Data Analytics**: Dashboard provides insights and statistics

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and hosting platform

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **React Hook Form**: Form state management
- **Zod**: Schema validation

### Development Tools
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and development server
- **ESBuild**: Production bundling
- **Drizzle Kit**: Database migration tool

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- TypeScript compilation with strict mode
- Database connection via environment variables
- Real-time error overlay for debugging

### Production Build
- Vite production build for optimized frontend assets
- ESBuild bundling for Node.js backend
- Static file serving from Express
- Environment-based configuration

### Database Management
- Schema defined in shared TypeScript files
- Drizzle migrations for version control
- Connection pooling via Neon serverless

## Changelog
- July 04, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.