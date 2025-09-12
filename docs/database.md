# Database Schema & Design

## Overview

The poker room management system uses Supabase (PostgreSQL) with a multitenant architecture. Each poker room (tenant) has isolated data with proper Row Level Security (RLS) policies.

## Core Tables

### Tenants
Central table for managing multiple poker rooms.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Players
Player accounts with phone-based authentication. Players are global and can visit any tenant.

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  alias VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Games
Poker game types and configurations.

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  game_type game_type NOT NULL,
  buy_in DECIMAL(10,2) NOT NULL,
  max_players INTEGER NOT NULL,
  rake TEXT,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tables
Physical poker tables with seating capacity.

```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  seat_count INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,
  status table_status DEFAULT 'available',
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table Seats
Individual seats at each table.

```sql
CREATE TABLE table_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_id, seat_number)
);
```

### Waitlist Entries
Player waitlist management.

```sql
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status waitlist_status DEFAULT 'waiting',
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tournaments
Tournament management and scheduling.

```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  game_type game_type NOT NULL,
  buy_in DECIMAL(10,2) NOT NULL,
  max_players INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status tournament_status DEFAULT 'scheduled',
  prize_pool DECIMAL(10,2) DEFAULT 0,
  rake TEXT,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tournament Entries
Player tournament registrations.

```sql
CREATE TABLE tournament_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  position INTEGER,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  status tournament_entry_status DEFAULT 'registered',
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);
```

### Operators
Staff accounts with tenant-specific roles and email-based authentication.

```sql
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  avatar_url TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role operator_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Friendships
Player friend relationships.

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, friend_id)
);
```

## Custom Types

```sql
-- Operator roles
CREATE TYPE operator_role AS ENUM ('admin', 'supervisor', 'dealer');

-- Game types
CREATE TYPE game_type AS ENUM (
  'texas_holdem',
  'omaha',
  'seven_card_stud',
  'five_card_draw',
  'razz',
  'stud_hi_lo'
);

-- Table status
CREATE TYPE table_status AS ENUM (
  'available',
  'occupied',
  'maintenance',
  'closed'
);

-- Waitlist status
CREATE TYPE waitlist_status AS ENUM (
  'waiting',
  'called',
  'seated',
  'cancelled'
);

-- Tournament status
CREATE TYPE tournament_status AS ENUM (
  'scheduled',
  'registering',
  'in_progress',
  'completed',
  'cancelled'
);

-- Tournament entry status
CREATE TYPE tournament_entry_status AS ENUM (
  'registered',
  'checked_in',
  'eliminated',
  'finished'
);

-- Friendship status
CREATE TYPE friendship_status AS ENUM (
  'pending',
  'accepted',
  'blocked'
);
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_players_phone_number ON players(phone_number);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_alias ON players(alias);

CREATE INDEX idx_operators_email ON operators(email);
CREATE INDEX idx_operators_tenant_id ON operators(tenant_id);
CREATE INDEX idx_operators_role ON operators(role);
CREATE INDEX idx_operators_active ON operators(tenant_id, is_active);

CREATE INDEX idx_games_tenant_id ON games(tenant_id);
CREATE INDEX idx_games_active ON games(tenant_id, is_active);

CREATE INDEX idx_tables_tenant_id ON tables(tenant_id);
CREATE INDEX idx_tables_game_id ON tables(game_id);
CREATE INDEX idx_tables_status ON tables(status);

CREATE INDEX idx_table_seats_table_id ON table_seats(table_id);
CREATE INDEX idx_table_seats_player_id ON table_seats(player_id);

CREATE INDEX idx_waitlist_entries_tenant_id ON waitlist_entries(tenant_id);
CREATE INDEX idx_waitlist_entries_game_id ON waitlist_entries(game_id);
CREATE INDEX idx_waitlist_entries_player_id ON waitlist_entries(player_id);
CREATE INDEX idx_waitlist_entries_position ON waitlist_entries(game_id, position);

CREATE INDEX idx_tournaments_tenant_id ON tournaments(tenant_id);
CREATE INDEX idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX idx_tournaments_status ON tournaments(status);

CREATE INDEX idx_tournament_entries_tournament_id ON tournament_entries(tournament_id);
CREATE INDEX idx_tournament_entries_player_id ON tournament_entries(player_id);

CREATE INDEX idx_friendships_player_id ON friendships(player_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
```

## Row Level Security (RLS)

### Enable RLS
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

#### Tenants
```sql
-- Players and operators can view any tenant
CREATE POLICY "Users can view tenants" ON tenants
  FOR SELECT USING (true);
```

#### Players
```sql
-- Players can view all players (for friend system)
CREATE POLICY "Players can view all players" ON players
  FOR SELECT USING (true);

-- Players can update their own profile
CREATE POLICY "Players can update their own profile" ON players
  FOR UPDATE USING (
    id = auth.uid()
  );

-- Players can insert their own profile
CREATE POLICY "Players can insert their own profile" ON players
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );
```

#### Operators
```sql
-- Operators can view operators in their tenant
CREATE POLICY "Operators can view operators in their tenant" ON operators
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid()
    )
  );

-- Operators can update their own profile
CREATE POLICY "Operators can update their own profile" ON operators
  FOR UPDATE USING (
    id = auth.uid()
  );

-- Admins can manage operators in their tenant
CREATE POLICY "Admins can manage operators in their tenant" ON operators
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
```

#### Games
```sql
-- Players and operators can view games in any tenant
CREATE POLICY "Users can view games" ON games
  FOR SELECT USING (true);

-- Operators can manage games in their tenant
CREATE POLICY "Operators can manage games in their tenant" ON games
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );
```

#### Tables
```sql
-- Players and operators can view tables in any tenant
CREATE POLICY "Users can view tables" ON tables
  FOR SELECT USING (true);

-- Operators can manage tables in their tenant
CREATE POLICY "Operators can manage tables in their tenant" ON tables
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor', 'dealer')
    )
  );
```

#### Waitlist Entries
```sql
-- Players can view and manage their own waitlist entries
CREATE POLICY "Players can manage their waitlist entries" ON waitlist_entries
  FOR ALL USING (
    player_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor', 'dealer')
    )
  );
```

#### Tournaments
```sql
-- Players and operators can view tournaments in any tenant
CREATE POLICY "Users can view tournaments" ON tournaments
  FOR SELECT USING (true);

-- Operators can manage tournaments in their tenant
CREATE POLICY "Operators can manage tournaments in their tenant" ON tournaments
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );
```

#### Tournament Entries
```sql
-- Players can manage their own tournament entries
CREATE POLICY "Players can manage their tournament entries" ON tournament_entries
  FOR ALL USING (
    player_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM operators 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor', 'dealer')
    )
  );
```

#### Friendships
```sql
-- Players can manage their own friendships
CREATE POLICY "Players can manage their friendships" ON friendships
  FOR ALL USING (
    player_id = auth.uid()
    OR friend_id = auth.uid()
  );
```

## Functions and Triggers

### Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_seats_updated_at BEFORE UPDATE ON table_seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_entries_updated_at BEFORE UPDATE ON tournament_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Waitlist Position Management
```sql
CREATE OR REPLACE FUNCTION update_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update positions when entries are added/removed
    IF TG_OP = 'INSERT' THEN
        UPDATE waitlist_entries 
        SET position = position + 1 
        WHERE game_id = NEW.game_id 
        AND position >= NEW.position 
        AND id != NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE waitlist_entries 
        SET position = position - 1 
        WHERE game_id = OLD.game_id 
        AND position > OLD.position;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_waitlist_positions_trigger
    AFTER INSERT OR DELETE ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_waitlist_positions();
```

## Sample Data

### Insert Sample Tenant
```sql
INSERT INTO tenants (name, code, description) VALUES
('The Royal Flush', 'royal', 'Premium poker room in downtown'),
('Ace High Casino', 'ace', 'Family-friendly poker room'),
('High Stakes Lounge', 'high', 'Exclusive high-limit games');
```

### Insert Sample Games
```sql
INSERT INTO games (name, game_type, buy_in, max_players, rake, tenant_id) VALUES
('Texas Hold''em $1/$2', 'texas_holdem', 200.00, 9, '5% rake, $5 max', (SELECT id FROM tenants WHERE code = 'royal')),
('Omaha $2/$5', 'omaha', 500.00, 8, '5% rake, $10 max', (SELECT id FROM tenants WHERE code = 'royal')),
('Seven Card Stud $5/$10', 'seven_card_stud', 1000.00, 7, '5% rake, $15 max', (SELECT id FROM tenants WHERE code = 'ace'));
```

### Insert Sample Tables
```sql
INSERT INTO tables (name, game_id, seat_count, tenant_id) VALUES
('Table 1', (SELECT id FROM games WHERE name = 'Texas Hold''em $1/$2'), 9, (SELECT id FROM tenants WHERE code = 'royal')),
('Table 2', (SELECT id FROM games WHERE name = 'Texas Hold''em $1/$2'), 9, (SELECT id FROM tenants WHERE code = 'royal')),
('Table 3', (SELECT id FROM games WHERE name = 'Omaha $2/$5'), 8, (SELECT id FROM tenants WHERE code = 'royal'));
```

## Migration Scripts

### Initial Migration
```sql
-- 001_initial_schema.sql
-- Run this script to set up the initial database schema

-- Create custom types
CREATE TYPE operator_role AS ENUM ('admin', 'supervisor', 'dealer');
CREATE TYPE game_type AS ENUM ('texas_holdem', 'omaha', 'seven_card_stud', 'five_card_draw', 'razz', 'stud_hi_lo');
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'maintenance', 'closed');
CREATE TYPE waitlist_status AS ENUM ('waiting', 'called', 'seated', 'cancelled');
CREATE TYPE tournament_status AS ENUM ('scheduled', 'registering', 'in_progress', 'completed', 'cancelled');
CREATE TYPE tournament_entry_status AS ENUM ('registered', 'checked_in', 'eliminated', 'finished');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- Create tables (see table definitions above)
-- Create indexes (see index definitions above)
-- Enable RLS (see RLS enable statements above)
-- Create RLS policies (see policy definitions above)
-- Create functions and triggers (see function definitions above)
```

### Future Migrations
```sql
-- 002_add_tournament_features.sql
-- 003_add_analytics_tables.sql
-- 004_add_notification_system.sql
```

## Backup and Maintenance

### Backup Strategy
```bash
# Daily backup script
pg_dump -h your-supabase-host -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h your-supabase-host -U postgres -d postgres < backup_20240101.sql
```

### Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
