# Database Migrations

This document outlines database schema changes needed for the DeepStack application.

## Player Preferences Feature

### Overview

Added a flexible preferences system to the `players` table to store all player preferences (including color theme) in a JSON field. This allows for easy extension of preferences without adding new columns for each preference type.

### Migration Required

#### Add preferences column to players table

```sql
-- Add preferences JSON column to players table
ALTER TABLE players
ADD COLUMN preferences JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN players.preferences IS 'Player preferences stored as JSON (e.g., {"color_theme": "neutral", "notifications": {"email": true, "sms": false}})';

-- Create GIN index for better JSON query performance
CREATE INDEX idx_players_preferences ON players USING GIN (preferences);

-- Add a check constraint to ensure preferences is always an object
ALTER TABLE players ADD CONSTRAINT check_preferences_is_object
CHECK (jsonb_typeof(preferences) = 'object');
```

### Available Theme Values

The following color themes are supported:

- `neutral` (default)
- `slate`
- `violet`
- `blue`
- `green`
- `red`
- `orange`
- `yellow`
- `pink`
- `zinc`
- `stone`
- `gray`
- `emerald`
- `teal`
- `cyan`
- `sky`
- `indigo`
- `purple`
- `fuchsia`
- `rose`

### JSON Structure Examples

#### Color Theme Preference

```json
{
  "color_theme": "neutral"
}
```

#### Future Preferences (examples)

```json
{
  "color_theme": "blue",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true
  },
  "privacy": {
    "show_online_status": true,
    "allow_friend_requests": true
  },
  "display": {
    "compact_mode": false,
    "show_avatars": true
  }
}
```

### Implementation Notes

- Default value is `'{}'` (empty object) to maintain backward compatibility
- Column is nullable to handle existing records
- Uses JSONB for better performance and indexing
- GIN index allows efficient querying of JSON properties
- Check constraint ensures data integrity
- Theme preferences are applied globally across the application
- Each theme supports both light and dark modes
- Changes are applied in real-time without requiring page refresh

### Query Examples

#### Get player's color theme

```sql
SELECT preferences->>'color_theme' as color_theme
FROM players
WHERE id = 'player_id';
```

#### Update color theme

```sql
UPDATE players
SET preferences = jsonb_set(preferences, '{color_theme}', '"blue"')
WHERE id = 'player_id';
```

#### Get all players with specific theme

```sql
SELECT * FROM players
WHERE preferences->>'color_theme' = 'blue';
```

### Testing

After implementing the migration:

1. Verify existing players have `preferences` set to `'{}'`
2. Test theme switching on the profile page
3. Confirm theme preferences persist across sessions
4. Verify theme applies correctly in both light and dark modes
5. Test JSON query performance with the GIN index

### Rollback (if needed)

```sql
-- Remove preferences column and related objects
DROP INDEX IF EXISTS idx_players_preferences;
ALTER TABLE players DROP CONSTRAINT IF EXISTS check_preferences_is_object;
ALTER TABLE players DROP COLUMN preferences;
```

## Poker Rooms and Games Feature

### Overview

Added tables for poker rooms and games to support the room browsing functionality. This includes room information, game types, and waitlist management.

### Migration Required

#### Create rooms table

```sql
-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(20),
  website VARCHAR(255),
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE rooms IS 'Poker rooms/venues where games are hosted';
COMMENT ON COLUMN rooms.name IS 'Name of the poker room';
COMMENT ON COLUMN rooms.description IS 'Brief description of the room';
COMMENT ON COLUMN rooms.address IS 'Physical address of the room';
COMMENT ON COLUMN rooms.phone IS 'Contact phone number';
COMMENT ON COLUMN rooms.website IS 'Room website URL';
COMMENT ON COLUMN rooms.image_url IS 'Room photo/image URL';
COMMENT ON COLUMN rooms.is_active IS 'Whether the room is currently active';

-- Create index for active rooms
CREATE INDEX idx_rooms_active ON rooms(is_active) WHERE is_active = true;
```

#### Create games table

```sql
-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL, -- 'nl_holdem', 'plo', 'stud', etc.
  stakes VARCHAR(100) NOT NULL, -- '1/2', '2/5', '5/10', etc.
  max_players INTEGER DEFAULT 9,
  current_players INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE games IS 'Individual poker games running at rooms';
COMMENT ON COLUMN games.game_type IS 'Type of poker game (nl_holdem, plo, stud, etc.)';
COMMENT ON COLUMN games.stakes IS 'Blind levels (e.g., 1/2, 2/5, 5/10)';
COMMENT ON COLUMN games.max_players IS 'Maximum number of players at the table';
COMMENT ON COLUMN games.current_players IS 'Current number of players at the table';
COMMENT ON COLUMN games.waitlist_count IS 'Number of players on waitlist';
COMMENT ON COLUMN games.is_active IS 'Whether the game is currently running';

-- Create indexes for better query performance
CREATE INDEX idx_games_room_id ON games(room_id);
CREATE INDEX idx_games_active ON games(is_active) WHERE is_active = true;
CREATE INDEX idx_games_type_stakes ON games(game_type, stakes);
```

#### Create waitlists table

```sql
-- Create waitlists table
CREATE TABLE waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Add comment for documentation
COMMENT ON TABLE waitlists IS 'Player waitlists for specific games';
COMMENT ON COLUMN waitlists.position IS 'Position in the waitlist (1-based)';

-- Create indexes
CREATE INDEX idx_waitlists_game_id ON waitlists(game_id);
CREATE INDEX idx_waitlists_player_id ON waitlists(player_id);
CREATE INDEX idx_waitlists_position ON waitlists(game_id, position);
```

### Game Types

The following game types are supported:

- `nl_holdem` - No Limit Texas Hold'em
- `plo` - Pot Limit Omaha
- `plo4` - Pot Limit Omaha 4-card
- `plo5` - Pot Limit Omaha 5-card
- `stud` - Seven Card Stud
- `stud8` - Seven Card Stud Hi/Lo
- `razz` - Razz (Seven Card Stud Low)
- `badugi` - Badugi
- `draw` - Five Card Draw
- `mixed` - Mixed games

### Sample Data

```sql
-- Insert sample rooms
INSERT INTO rooms (name, description, address, phone, website) VALUES
('The Card Room', 'Premium poker room with 20+ tables', '123 Main St, City, State', '555-0123', 'https://thecardroom.com'),
('Lucky 7 Casino', 'Full service casino with poker room', '456 Casino Blvd, City, State', '555-0456', 'https://lucky7casino.com'),
('Players Club', 'Members-only poker club', '789 Club Ave, City, State', '555-0789', 'https://playersclub.com');

-- Insert sample games
INSERT INTO games (room_id, game_type, stakes, max_players, current_players, waitlist_count) VALUES
((SELECT id FROM rooms WHERE name = 'The Card Room'), 'nl_holdem', '1/2', 9, 7, 3),
((SELECT id FROM rooms WHERE name = 'The Card Room'), 'nl_holdem', '2/5', 9, 9, 5),
((SELECT id FROM rooms WHERE name = 'The Card Room'), 'plo', '2/5', 8, 6, 2),
((SELECT id FROM rooms WHERE name = 'Lucky 7 Casino'), 'nl_holdem', '1/2', 9, 5, 1),
((SELECT id FROM rooms WHERE name = 'Lucky 7 Casino'), 'nl_holdem', '5/10', 9, 8, 4),
((SELECT id FROM rooms WHERE name = 'Players Club'), 'nl_holdem', '2/5', 9, 9, 6),
((SELECT id FROM rooms WHERE name = 'Players Club'), 'mixed', '5/10', 8, 4, 0);
```

### Rollback (if needed)

```sql
-- Remove tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS waitlists;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS rooms;
```
