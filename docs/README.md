# DeepStack Documentation

Welcome to the DeepStack documentation. This comprehensive guide covers all aspects of the multi-room poker room management system.

## System Overview

DeepStack is a modern poker room management system built with Next.js, Supabase, and shadcn/ui. It provides a complete solution for managing poker rooms, games, waitlists, and tournaments.

### Key Features

- **Multi-room Architecture**: Support for multiple poker rooms with isolated data
- **Player Management**: Phone-based authentication for players
- **Operator Management**: Email/password authentication for staff
- **Waitlist System**: Advanced waitlist management with real-time updates
- **Game Management**: Support for various poker game types
- **Tournament Management**: Complete tournament scheduling and management
- **Real-time Updates**: Live updates using Supabase real-time
- **Mobile Responsive**: Optimized for both desktop and mobile devices

## Documentation Structure

### Core System Documentation

- **[Database Schema](database.md)** - Complete database schema and relationships
- **[API Documentation](api.md)** - REST API endpoints and usage
- **[Authentication](auth.md)** - Authentication and authorization system
- **[Multi-room Patterns](multiroom-patterns.md)** - Multi-room architecture patterns

### Feature Documentation

- **[Waitlist System](waitlist-system.md)** - Comprehensive waitlist management system
- **[Waitlist UI Components](waitlist-ui-components.md)** - UI components for waitlist management
- **[Waitlist Workflows](waitlist-workflows.md)** - Detailed workflow documentation
- **[Waitlist Position System](waitlist-position-system.md)** - Fractional indexing for waitlist management
- **[Buddies System](buddies-system.md)** - Player friend system

### Infrastructure Documentation

- **[Deployment](deployment.md)** - Deployment and hosting instructions
- **[IP Restrictions](ip-restrictions.md)** - IP-based access control
- **[Room Resolution](room-resolution.md)** - Room URL resolution system
- **[Metrics](metrics.md)** - System metrics and monitoring

### Development Documentation

- **[Contributing](contributing.md)** - Development guidelines and contribution process

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations
5. Start development server: `npm run dev`

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI**: shadcn/ui with Tailwind CSS
- **Language**: TypeScript (strict mode)
- **Forms**: React Hook Form with Zod validation

### Database

- **PostgreSQL** with Supabase
- **Row Level Security (RLS)** for data isolation
- **Real-time subscriptions** for live updates
- **TypeScript types** generated from schema

### Authentication

- **Players**: Phone-based OTP authentication
- **Operators**: Email/password authentication
- **JWT tokens** for session management
- **Role-based access control**

## Key Concepts

### Multi-room Architecture

Each poker room operates as an isolated room with:

- Separate data isolation
- Customizable settings
- Independent user management
- Room-specific configurations

### Waitlist Management

Advanced waitlist system supporting:

- Remote call-ins with expiry timers
- In-person check-ins
- Multi-game player support
- Real-time position updates
- Automatic expiry handling

### Real-time Updates

Live updates using Supabase real-time:

- Waitlist position changes
- Status updates
- New entries and cancellations
- Seat assignments

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow ESLint configuration
- Use shadcn/ui components when available
- Implement proper error handling
- Write comprehensive tests

### Database Patterns

- Always use RLS policies
- Use Supabase client for operations
- Implement proper error handling
- Use generated TypeScript types

### Component Patterns

- Use functional components with hooks
- Implement proper prop types
- Use error boundaries
- Follow mobile-first design

## API Reference

### Base URL

```
https://your-domain.com/api/[room]
```

### Authentication

All API requests require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Common Endpoints

- `GET /waitlist` - Get waitlist entries
- `POST /waitlist` - Add player to waitlist
- `PUT /waitlist/[id]/status` - Update waitlist status
- `GET /games` - Get available games
- `GET /tables` - Get table information

## Database Schema

### Core Tables

- `rooms` - Poker room information
- `players` - Player profiles and authentication
- `operators` - Staff and admin users
- `games` - Poker game configurations
- `tables` - Physical table information
- `waitlist_entries` - Waitlist management
- `player_sessions` - Active player sessions

### Relationships

- Players can have multiple waitlist entries
- Operators belong to specific rooms
- Games are associated with rooms
- Tables host specific games
- Sessions track player activity

## Security

### Data Protection

- Row Level Security (RLS) for data isolation
- JWT token validation
- Input sanitization and validation
- HTTPS enforcement in production

### Access Control

- Role-based permissions
- Room-specific access
- API endpoint protection
- Audit logging

## Performance

### Optimization

- Database query optimization
- Real-time subscription management
- Component memoization
- Image optimization

### Monitoring

- Performance metrics
- Error tracking
- User analytics
- System health monitoring

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check JWT token validity
   - Verify user permissions
   - Check room access

2. **Real-time Issues**
   - Verify Supabase real-time is enabled
   - Check subscription filters
   - Validate authentication

3. **Database Errors**
   - Check RLS policies
   - Verify data constraints
   - Review error logs

### Debug Tools

- Supabase dashboard
- Browser developer tools
- Network tab monitoring
- Console logging

## Support

### Getting Help

- Check this documentation first
- Review existing issues on GitHub
- Ask questions in GitHub Discussions
- Join the Discord community

### Reporting Issues

- Use GitHub Issues for bug reports
- Include reproduction steps
- Provide error logs
- Include system information

## Contributing

See [Contributing Guidelines](contributing.md) for detailed information on how to contribute to the project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Changelog

### Version 1.0.0

- Initial release
- Basic waitlist management
- Player and operator authentication
- Real-time updates
- Mobile responsive design

### Upcoming Features

- Tournament management
- Advanced analytics
- Mobile app
- Payment integration
- Loyalty program

---

For more detailed information, please refer to the specific documentation files listed above.
