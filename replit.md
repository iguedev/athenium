# ATHENIUM Trading Platform

## Overview

ATHENIUM is a sophisticated trading mentorship platform that combines a visually stunning animated landing page with a full-stack trading application. The platform features an immersive visual essay-style entry experience with GSAP animations, followed by comprehensive user authentication, dashboard functionality, and administrative capabilities. Designed "by traders for traders," it provides a professional environment for trading education and portfolio management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a multi-layered frontend approach optimized for visual excellence and user experience:

- **Vanilla JavaScript with Animation Libraries**: Core frontend built with pure HTML/CSS/JavaScript, enhanced by GSAP (GreenSock) for professional animations including ScrollTrigger, TextPlugin, and SplitText capabilities
- **Smooth Scrolling Integration**: Lenis library provides enhanced scroll experiences throughout the platform
- **Custom Theming System**: CSS custom properties enable consistent dark-mode design with glassmorphism effects tailored for trading environments
- **Responsive Component Structure**: Modular HTML structure with separate pages for landing (index.html), authentication (auth.html), dashboard (dashboard.html), and administration (admin.html)

### Backend Architecture
The server-side implementation follows a Node.js/Express pattern with modular authentication and data management:

- **Express.js Server**: Lightweight server configuration handling static file serving, API endpoints, and middleware integration
- **Passport.js Authentication**: Local strategy implementation with secure password hashing using Node.js crypto module
- **Session Management**: Express-session with optional PostgreSQL session store for production persistence
- **File Upload Handling**: Multer integration for secure file uploads with type validation and storage management

### Database Design
The data layer employs Drizzle ORM with PostgreSQL for type-safe database operations:

- **User Management**: Enhanced user schema with trading-specific fields including unique trading IDs, progress tracking, profile customization, and trading preferences
- **Content Management**: Global files and links tables for administrative content distribution
- **Schema Validation**: Zod integration for runtime type checking and data validation
- **Migration Support**: Drizzle-kit configuration for database schema evolution

### Design System
The visual architecture prioritizes professional trading aesthetics with performance considerations:

- **Dark-First Design**: Primary color palette optimized for extended trading sessions with reduced eye strain
- **TheGoodMonolith Typography**: Custom monospace font providing professional trading platform aesthetics
- **Glassmorphism Effects**: Subtle backdrop filters and transparency effects creating modern, layered interfaces
- **Professional Trading UI**: Components designed for data density and information hierarchy suitable for financial applications

## External Dependencies

### Animation and UI Libraries
- **GSAP (GreenSock)**: Professional animation library with ScrollTrigger, TextPlugin, CustomEase, and SplitText plugins for smooth, performant animations
- **Lenis**: Smooth scrolling library enhancing the user scroll experience across all platform sections

### Backend Framework and Middleware
- **Express.js**: Core web application framework handling routing, middleware, and server functionality
- **Passport.js**: Authentication middleware with local strategy for email/password authentication
- **Express-session**: Session management with optional PostgreSQL persistence
- **Multer**: File upload middleware with storage configuration and file type validation

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit providing schema definition, query building, and migration management
- **@neondatabase/serverless**: PostgreSQL client optimized for serverless environments with WebSocket support
- **connect-pg-simple**: PostgreSQL session store for production session persistence

### Development and Build Tools
- **Drizzle-kit**: Database migration and schema management toolkit
- **Zod**: Runtime type validation library for schema validation and data transformation
- **TypeScript Support**: Type definitions for enhanced development experience

### Validation and Security
- **Zod**: Runtime schema validation for user inputs and data transformation
- **Node.js Crypto**: Built-in cryptographic functions for secure password hashing and comparison
- **Custom Security Measures**: Input sanitization, file type validation, and session security configurations