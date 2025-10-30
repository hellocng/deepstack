# DeepStack Database Schema & Design

## Overview

The poker room management system uses Supabase (PostgreSQL) with a multitenant architecture. Each poker room has isolated data with proper Row Level Security (RLS) policies.

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

Unified player table supporting both registered and anonymous players.

**Registered Players**: `auth_id` is NOT NULL, have Supabase Auth entry, can visit any room
**Anonymous Players**: `auth_id` is NULL, no Supabase Auth entry, room-specific, managed by operators

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE, -- Optional for all players
  alias VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = anonymous, NOT NULL = registered
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
  small_blind DECIMAL(10,2) NOT NULL,
  big_blind DECIMAL(10,2) NOT NULL,
  min_buy_in DECIMAL(10,2) NOT NULL,
  max_buy_in DECIMAL(10,2) NOT NULL,
  rake TEXT,
  description TEXT,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tables

Physical poker table definitions (no session tracking).

```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  seat_count INTEGER NOT NULL, -- Maximum physical seats
  status table_status DEFAULT 'open',
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table Sessions

Individual table sessions - **one record per session**. When a table closes and reopens, a new record is created.

```sql
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE, -- NULL = currently active session
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Table Session States:**

- **Active**: `end_time IS NULL` (session in progress)
- **Ended**: `end_time IS NOT NULL` (session completed)

### Player Sessions

**Single source of truth for player counts** - tracks when players sit down and leave.

```sql
CREATE TABLE player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE, -- NULL = currently active session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_id, seat_number, end_time) -- Allow multiple sessions per seat over time
);
```

**Current players at table**: `SELECT COUNT(*) FROM player_sessions WHERE table_id = ? AND end_time IS NULL`

### Waitlist Entries

Player waitlist management with enhanced status tracking and multi-game support.

```sql
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  status waitlist_status DEFAULT 'calledin',
  position DECIMAL(20,10) DEFAULT EXTRACT(EPOCH FROM NOW()),

  -- Timestamps for status tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  notified_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Cancellation tracking
  cancelled_by cancelled_by_type,

  -- Notes and preferences
  notes TEXT,
  entry_method entry_method_type DEFAULT 'callin',
  check_in_immediately BOOLEAN DEFAULT FALSE,

  -- Multi-game support
  other_game_entries UUID[] DEFAULT '{}',
  keep_other_entries BOOLEAN DEFAULT TRUE
);

-- Waitlist status enum
CREATE TYPE waitlist_status AS ENUM (
  'waiting',    -- Checked in and waiting
  'calledin',   -- Called in remotely, needs check-in
  'notified',   -- Notified of seat availability
  'seated',     -- Seated at table
  'cancelled',  -- Cancelled by player or staff
  'expired'     -- Expired due to time limits
);

-- Entry method enum
CREATE TYPE entry_method_type AS ENUM (
  'callin',     -- Remote call-in
  'inperson'    -- In-person at desk
);

-- Cancellation tracking enum
CREATE TYPE cancelled_by_type AS ENUM (
  'player',     -- Player cancelled
  'staff',      -- Staff cancelled
  'system'      -- System cancelled (expired)
);
```

### Room Settings

Room-specific configuration for waitlist time limits and behavior.

```sql
CREATE TABLE room_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,

  -- Time limits (in minutes)
  call_in_expiry_minutes INTEGER DEFAULT 90,
  notify_expiry_minutes INTEGER DEFAULT 5,
  grace_period_minutes INTEGER DEFAULT 2,

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
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
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
  anonymous_player_id UUID REFERENCES anonymous_players(id) ON DELETE CASCADE,
  position INTEGER,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  status tournament_entry_status DEFAULT 'registered',
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_tournament_entry_player_type CHECK (
    (player_id IS NOT NULL AND anonymous_player_id IS NULL) OR
    (player_id IS NULL AND anonymous_player_id IS NOT NULL)
  )
);
```

### Operators

Staff accounts with tenant-specific roles and email-based authentication via Supabase Auth.

```sql
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL, -- Links to Supabase Auth users
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  avatar_url TEXT,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  role operator_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Friendships

Player friendship relationships with **automatic bidirectionality**.

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

**Automatic Bidirectionality:**

- When A friends B, the system automatically creates B → A friendship
- Status changes are automatically synchronized in both directions
- Prevents duplicate friendships while ensuring consistency

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
  'open',
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
CREATE INDEX idx_players_auth_id ON players(auth_id);

CREATE INDEX idx_operators_email ON operators(email);
CREATE INDEX idx_operators_room_id ON operators(room_id);
CREATE INDEX idx_operators_role ON operators(role);
CREATE INDEX idx_operators_tenant_role ON operators(room_id, role);

CREATE INDEX idx_games_room_id ON games(room_id);
CREATE INDEX idx_games_active ON games(room_id, is_active);

CREATE INDEX idx_tables_room_id ON tables(room_id);
CREATE INDEX idx_tables_game_id ON tables(game_id);
CREATE INDEX idx_tables_status ON tables(status);

CREATE INDEX idx_player_sessions_table_id ON player_sessions(table_id);
CREATE INDEX idx_player_sessions_player_id ON player_sessions(player_id);
CREATE INDEX idx_player_sessions_start_time ON player_sessions(start_time);
CREATE INDEX idx_player_sessions_end_time ON player_sessions(end_time);
CREATE INDEX idx_player_sessions_active ON player_sessions(table_id, end_time) WHERE end_time IS NULL;

CREATE INDEX idx_waitlist_entries_room_id ON waitlist_entries(room_id);
CREATE INDEX idx_waitlist_entries_game_id ON waitlist_entries(game_id);
CREATE INDEX idx_waitlist_entries_player_id ON waitlist_entries(player_id);
CREATE INDEX idx_waitlist_entries_created_at ON waitlist_entries(game_id, created_at);

CREATE INDEX idx_tournaments_room_id ON tournaments(room_id);
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
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
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

#### Anonymous Players

```sql
-- Operators can manage anonymous players in their tenant
CREATE POLICY "Operators can manage anonymous players in their tenant" ON players
  FOR ALL USING (
    auth_id IS NULL AND
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'supervisor', 'dealer')
    )
  );
```

#### Operators

```sql
-- Operators can view operators in their tenant
CREATE POLICY "Operators can view operators in their tenant" ON operators
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
    )
  );

-- Operators can update their own profile
CREATE POLICY "Operators can update their own profile" ON operators
  FOR UPDATE USING (
    auth_id = auth.uid()
  );

-- Admins can manage operators in their tenant
CREATE POLICY "Admins can manage operators in their tenant" ON operators
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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
    OR room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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
    room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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
    OR room_id IN (
      SELECT room_id FROM operators
      WHERE auth_id = auth.uid()
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

### Player Count Helper Functions

```sql
-- Get current player count for a table session
CREATE OR REPLACE FUNCTION get_current_players_at_table_session(session_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM player_sessions
    WHERE table_id = session_uuid
    AND end_time IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Get available seats for a table session
CREATE OR REPLACE FUNCTION get_available_seats_at_table_session(session_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT t.seat_count - COALESCE(get_current_players_at_table_session(session_uuid), 0)
    FROM table_sessions ts
    JOIN tables t ON t.id = ts.table_id
    WHERE ts.id = session_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Check if table session has space
CREATE OR REPLACE FUNCTION table_session_has_space(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_available_seats_at_table_session(session_uuid) > 0;
END;
$$ LANGUAGE plpgsql;
```

### Table Session Helper Functions

```sql
-- Check if table session is currently active
CREATE OR REPLACE FUNCTION is_table_session_active(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT end_time IS NULL
    FROM table_sessions
    WHERE id = session_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Get table session duration
CREATE OR REPLACE FUNCTION get_table_session_duration(session_uuid UUID)
RETURNS INTERVAL AS $$
BEGIN
  RETURN (
    SELECT
      CASE
        WHEN end_time IS NOT NULL THEN end_time - start_time
        ELSE NOW() - start_time
      END
    FROM table_sessions
    WHERE id = session_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Start a new table session
CREATE OR REPLACE FUNCTION start_new_table_session(table_uuid UUID, tenant_uuid UUID)
RETURNS UUID AS $$
DECLARE
  new_session_id UUID;
BEGIN
  INSERT INTO table_sessions (table_id, room_id, start_time)
  VALUES (table_uuid, tenant_uuid, NOW())
  RETURNING id INTO new_session_id;

  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql;

-- End a table session
CREATE OR REPLACE FUNCTION end_table_session(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE table_sessions
  SET
    end_time = NOW(),
    updated_at = NOW()
  WHERE id = session_uuid
  AND end_time IS NULL; -- Only end if currently active

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

### Friendship Bidirectionality Triggers

```sql
-- Create bidirectional friendship on insert
CREATE OR REPLACE FUNCTION create_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create the reverse friendship if it doesn't already exist
  -- and if we're not creating a duplicate (same player_id and friend_id)
  IF NEW.player_id != NEW.friend_id THEN
    INSERT INTO friendships (player_id, friend_id, status, created_at, updated_at)
    VALUES (
      NEW.friend_id,
      NEW.player_id,
      NEW.status,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (player_id, friend_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync status changes in both directions
CREATE OR REPLACE FUNCTION sync_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if the status changed and it's not a self-friendship
  IF OLD.status != NEW.status AND NEW.player_id != NEW.friend_id THEN
    UPDATE friendships
    SET
      status = NEW.status,
      updated_at = NEW.updated_at
    WHERE player_id = NEW.friend_id
    AND friend_id = NEW.player_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
CREATE TRIGGER trigger_create_bidirectional_friendship
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_bidirectional_friendship();

CREATE TRIGGER trigger_sync_bidirectional_friendship
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION sync_bidirectional_friendship();
```

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
-- Waitlist entries are now ordered chronologically by created_at
-- No need for position management functions or triggers
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
INSERT INTO games (name, game_type, buy_in, max_players, rake, room_id) VALUES
('Texas Hold''em $1/$2', 'texas_holdem', 200.00, 9, '5% rake, $5 max', (SELECT id FROM tenants WHERE code = 'royal')),
('Omaha $2/$5', 'omaha', 500.00, 8, '5% rake, $10 max', (SELECT id FROM tenants WHERE code = 'royal')),
('Seven Card Stud $5/$10', 'seven_card_stud', 1000.00, 7, '5% rake, $15 max', (SELECT id FROM tenants WHERE code = 'ace'));
```

### Insert Sample Tables

```sql
INSERT INTO tables (name, game_id, seat_count, room_id) VALUES
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
