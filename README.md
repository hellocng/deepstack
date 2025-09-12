# Poker Room Management System

A comprehensive multitenant poker room management application built with Next.js, Supabase, and shadcn/ui.

## 🎯 Overview

This application provides a complete solution for managing poker rooms, including game management, player waitlists, tournament organization, and real-time player interactions. The system supports multiple poker rooms (tenants) with role-based access control for operators and players.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14+ with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase OAuth
- **UI Components**: shadcn/ui with Tailwind CSS
- **Deployment**: Vercel (recommended)

### Multitenant Structure
```
/[tenant]          # Player-facing pages
/[tenant]/admin    # Operator management pages
```

## 👥 User Roles

### Players
- Sign up for waitlists
- View available games and tables
- See friends online
- Join games when available
- View tournament schedules

### Operators
- Manage games and tables
- Handle waitlists
- Organize tournaments
- Monitor player activity
- Access admin dashboard

## 🚀 Features

### Core Features
- [ ] **Multitenant Architecture**: Support for multiple poker rooms
- [ ] **User Authentication**: OAuth integration with Supabase
- [ ] **Game Management**: Create, update, and manage poker games
- [ ] **Table Management**: Real-time table status and seating
- [ ] **Waitlist System**: Queue management for players
- [ ] **Tournament Management**: Schedule and manage tournaments
- [ ] **Player Directory**: Find and connect with friends
- [ ] **Real-time Updates**: Live status updates using Supabase real-time

### Admin Features
- [ ] **Dashboard**: Overview of room activity
- [ ] **Game Controls**: Start/stop games, manage tables
- [ ] **Player Management**: View player profiles and history
- [ ] **Analytics**: Game statistics and reporting
- [ ] **Settings**: Room configuration and preferences

## 📁 Project Structure

```
├── app/
│   ├── [tenant]/
│   │   ├── admin/          # Operator management pages
│   │   ├── games/          # Game listings and details
│   │   ├── tables/         # Table management
│   │   ├── tournaments/    # Tournament pages
│   │   └── waitlist/       # Waitlist management
│   ├── api/                # API routes
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── forms/              # Form components
│   ├── tables/             # Table-related components
│   └── admin/              # Admin-specific components
├── lib/
│   ├── supabase/           # Supabase client and utilities
│   ├── auth/               # Authentication utilities
│   └── utils.ts            # General utilities
├── types/                  # TypeScript type definitions
└── .cursor/                # Cursor rules and configuration
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poker-room-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations (see `/docs/database.md`)
   - Configure OAuth providers in Supabase dashboard

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📚 Documentation

- [Database Schema](./docs/database.md)
- [API Documentation](./docs/api.md)
- [Authentication Guide](./docs/auth.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guidelines](./docs/contributing.md)

## 🔧 Development

### Code Style
- Use TypeScript for all new files
- Follow the established component patterns
- Use shadcn/ui components when possible
- Implement proper error handling
- Write comprehensive tests

### Database
- Use Supabase migrations for schema changes
- Follow naming conventions (snake_case for tables/columns)
- Implement proper RLS (Row Level Security) policies

### Authentication
- Use Supabase Auth for all authentication
- Implement proper role-based access control
- Secure admin routes with middleware

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@pokerroom.com or join our Discord community.

---

**Built with ❤️ for the poker community**
