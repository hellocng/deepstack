# DeepStack - Agent Instructions

## Project Overview
This is a multitenant poker room management application built with Next.js, Supabase, and shadcn/ui. The system allows operators to manage games, tables, waitlists, and tournaments, while players can join waitlists, view games, and connect with friends.

## Tech Stack
- **Frontend**: Next.js 14+ with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: 
  - Players: Phone-based OTP authentication
  - Operators: Email/password authentication
- **UI**: shadcn/ui with Tailwind CSS
- **Language**: TypeScript (strict mode)

## Architecture

### Multitenant Structure
- URL pattern: `/[tenant]` for player pages, `/[tenant]/admin` for operator pages
- Each tenant (poker room) has isolated data with proper RLS policies
- Tenant context is managed throughout the application

### User Types
- **Players**: Phone-based authentication, can visit any tenant, join waitlists, see friends, register for tournaments
- **Operators**: Email/password authentication, tenant-specific roles:
  - **Admin**: Full system access including operator management
  - **Supervisor**: Can manage games, tables, tournaments, view player activity
  - **Dealer**: Can manage tables and basic operations

## Development Guidelines

### Code Style
- Use TypeScript for all new files with strict mode
- Follow the component patterns defined in `.cursor/rules/component-patterns.mdc`
- Use shadcn/ui components when available
- Implement proper error handling and loading states
- Use snake_case for database tables/columns, camelCase for TypeScript

### Database Patterns
- Always use Row Level Security (RLS) policies
- Use Supabase client for all database operations
- Follow the patterns in `.cursor/rules/database-patterns.mdc`
- Implement proper TypeScript types from database schema
- Separate players and operators into different tables
- Players use phone-based authentication, operators use email/password

### Authentication & Authorization
- Use Supabase Auth for all authentication
- Players: Phone-based OTP authentication (global, can visit any tenant)
- Operators: Email/password authentication (tenant-specific)
- Use middleware for route protection
- Follow the patterns in `.cursor/rules/multitenant-patterns.mdc`

### Component Development
- Use functional components with hooks
- Implement proper prop types and interfaces
- Use error boundaries for error handling
- Follow mobile-first responsive design
- Implement proper accessibility features

### API Development
- Use Next.js API routes with proper error handling
- Implement tenant-aware API endpoints
- Use proper HTTP status codes
- Implement rate limiting and input validation
- Follow the patterns in `docs/api.md`

## Key Features to Implement

### Core Features
1. **Game Management**: Create, update, delete poker games with different types
2. **Table Management**: Manage physical tables with seating capacity
3. **Waitlist System**: Queue management for players wanting to join games
4. **Tournament Management**: Schedule and manage poker tournaments
5. **Player Directory**: Friend system and player profiles
6. **Real-time Updates**: Live status updates using Supabase real-time

### Admin Features
1. **Dashboard**: Overview of room activity and statistics
2. **Game Controls**: Start/stop games, manage table assignments
3. **Player Management**: View player profiles and game history
4. **Analytics**: Game statistics and reporting
5. **Settings**: Room configuration and preferences

## File Structure
```
app/
├── [tenant]/
│   ├── admin/          # Operator management pages
│   ├── games/          # Game listings and details
│   ├── tables/         # Table management
│   ├── tournaments/    # Tournament pages
│   └── waitlist/       # Waitlist management
├── api/                # API routes
└── layout.tsx          # Root layout

components/
├── ui/                 # shadcn/ui components
├── forms/              # Form components
├── tables/             # Table-related components
└── admin/              # Admin-specific components

lib/
├── supabase/           # Supabase client and utilities
├── auth/               # Authentication utilities
└── utils.ts            # General utilities

types/                  # TypeScript type definitions
.cursor/                # Cursor rules and configuration
```

## Testing
- Write unit tests for utility functions and components
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Aim for 80%+ code coverage
- Use Jest for unit tests, Playwright for E2E tests

## Performance
- Use React.memo for expensive components
- Implement proper loading states
- Use Supabase real-time efficiently
- Optimize images and assets
- Implement proper caching strategies

## Security
- Never expose sensitive data in client-side code
- Use environment variables for secrets
- Implement proper input sanitization
- Use HTTPS in production
- Validate JWT tokens properly

## Documentation
- Update README when adding new features
- Document API changes
- Include setup instructions for new dependencies
- Keep deployment instructions current
- Use JSDoc for function documentation

## Common Patterns

### Creating a New Component
1. Create component file in appropriate directory
2. Define TypeScript interfaces for props
3. Implement component with proper error handling
4. Add loading states and accessibility features
5. Write tests for the component
6. Update documentation if needed

### Creating a New API Route
1. Create route file in `app/api/[tenant]/` directory
2. Implement proper authentication and authorization
3. Add input validation using Zod
4. Implement proper error handling
5. Add rate limiting if needed
6. Write tests for the API endpoint

### Database Operations
1. Use Supabase client for all operations
2. Implement proper error handling
3. Use TypeScript types from database schema
4. Ensure RLS policies are properly configured
5. Use transactions for complex operations

## Best Practices
- Keep components small and focused
- Use proper TypeScript types
- Implement proper error boundaries
- Use semantic HTML elements
- Follow accessibility guidelines
- Optimize for performance
- Write comprehensive tests
- Document complex business logic
- Use proper Git commit messages
- Follow the established code style

## Getting Help
- Check existing documentation in `/docs` directory
- Review Cursor rules in `.cursor/rules` directory
- Look at existing code for patterns and examples
- Ask questions in GitHub Discussions
- Join the Discord community for real-time help
