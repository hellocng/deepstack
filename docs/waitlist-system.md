# Waitlist Management System

## Overview

The waitlist system manages player queues for poker games with two entry methods: remote "call-ins" and in-person check-ins. The system handles time-based expirations, notifications, and seat assignments with comprehensive status tracking.

## System Architecture

### Entry Methods

1. **Remote Call-in** - Players join via mobile app
   - Status: `calledin` (default for remote entries)
   - Expiry: Configurable (default: 90 minutes)
   - Requires check-in by staff

2. **In-person Check-in** - Staff adds player at poker desk
   - Status: `waiting` (if checked in immediately)
   - Status: `calledin` (if not checked in)
   - No expiry until checked in

### Waitlist Status Flow

```
calledin → waiting → notified → seated
    ↓         ↓         ↓
cancelled  cancelled  cancelled
    ↓
  expired
```

## Database Schema

### Waitlist Entries Table

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
  entry_method entry_method_type DEFAULT 'callin', -- 'callin' | 'inperson'
  check_in_immediately BOOLEAN DEFAULT FALSE,

  -- Multi-game support
  other_game_entries UUID[] DEFAULT '{}', -- IDs of other waitlist entries for same player
  keep_other_entries BOOLEAN DEFAULT TRUE
);

-- Status enum
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

-- Cancellation tracking
CREATE TYPE cancelled_by_type AS ENUM (
  'player',     -- Player cancelled
  'staff',      -- Staff cancelled
  'system'      -- System cancelled (expired)
);
```

### Room Settings Table

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

## Status Management

### Status Definitions

| Status      | Description                   | Actions Available    | Expiry                |
| ----------- | ----------------------------- | -------------------- | --------------------- |
| `calledin`  | Player called in remotely     | Check in, Cancel     | 90 min (configurable) |
| `waiting`   | Checked in, waiting for seat  | Notify, Cancel       | None                  |
| `notified`  | Notified of seat availability | Seat, Recall, Cancel | 5 min (configurable)  |
| `seated`    | Seated at table               | None                 | None                  |
| `cancelled` | Cancelled by player/staff     | None                 | None                  |
| `expired`   | Expired due to time limits    | None                 | None                  |

### Status Transitions

```typescript
interface StatusTransition {
  from: WaitlistStatus
  to: WaitlistStatus
  action: string
  conditions?: string[]
}

const STATUS_TRANSITIONS: StatusTransition[] = [
  { from: 'calledin', to: 'waiting', action: 'checkin' },
  { from: 'calledin', to: 'cancelled', action: 'cancel' },
  { from: 'calledin', to: 'expired', action: 'expire' },
  { from: 'waiting', to: 'notified', action: 'notify' },
  { from: 'waiting', to: 'cancelled', action: 'cancel' },
  { from: 'notified', to: 'seated', action: 'seat' },
  { from: 'notified', to: 'waiting', action: 'recall' },
  { from: 'notified', to: 'cancelled', action: 'cancel' },
  { from: 'notified', to: 'expired', action: 'expire' },
]
```

## User Interface Components

### 1. Waitlist Management Page

#### Header Section

- **Search/Filter Bar**
  - Search by player alias
  - Filter by game type
  - Filter by status
  - Filter by entry method

#### Main Waitlist Section

- **Active Entries Table**
  - Position number
  - Player alias/name
  - Game type and stakes
  - Status with countdown timer
  - Entry method indicator
  - Action buttons (context-sensitive)
  - Time in queue

#### Voided Entries Section

- **Expired/Cancelled Entries**
  - Collapsible section below main waitlist
  - Shows reason for removal
  - Time stamps for audit trail
  - Option to restore (if applicable)

### 2. Add Player Dialog

#### For Remote Call-ins

```typescript
interface AddPlayerDialogProps {
  games: Game[]
  activePlayers: Player[]
  onAdd: (entry: CreateWaitlistEntry) => void
}

interface CreateWaitlistEntry {
  player_id?: string
  alias?: string
  game_id: string
  entry_method: 'callin'
  notes?: string
}
```

#### For In-person Check-ins

```typescript
interface InPersonEntryProps {
  games: Game[]
  activePlayers: Player[]
  onAdd: (entry: CreateWaitlistEntry) => void
}

interface CreateWaitlistEntry {
  player_id?: string
  alias?: string
  game_id: string
  entry_method: 'inperson'
  check_in_immediately: boolean
  notes?: string
}
```

### 3. Player Selection Component

#### Toggle Between Alias Entry and Player Selection

```typescript
interface PlayerSelectionProps {
  mode: 'alias' | 'player'
  onModeChange: (mode: 'alias' | 'player') => void
  activePlayers: Player[]
  onPlayerSelect: (player: Player) => void
  onAliasChange: (alias: string) => void
}
```

#### Active Player Detection

```typescript
// Query to find active players
const getActivePlayers = async (roomId: string): Promise<Player[]> => {
  const { data } = await supabase
    .from('player_sessions')
    .select(
      `
      player_id,
      players!inner(
        id,
        alias,
        avatar_url
      )
    `
    )
    .eq('room_id', roomId)
    .is('end_time', null) // Active session
    .not('player_id', 'is', null)
}
```

## API Endpoints

### Waitlist Management

The current waitlist UI queries Supabase directly for live data and relies on a
small set of API routes for player self-service and operator actions.

#### GET /api/rooms/[room]/waitlist/status

Return the authenticated player's active waitlist entries for the specified
room. The UI uses this to power the player's "Your Status" card.

```typescript
type WaitlistStatusResponse = {
  success: boolean
  entries: Array<{
    id: string
    status: 'waiting' | 'calledin' | 'notified'
    position: number | null
    created_at: string | null
    checked_in_at: string | null
    notified_at: string | null
    notes: string | null
    game: {
      id: string
      name: string
      game_type: string
      small_blind: number
      big_blind: number
    } | null
  }>
}
```

#### POST /api/rooms/[room]/waitlist/join

Allow an authenticated player to join one or more waitlists. The request body
matches the React form on `/[room]/waitlist`:

```typescript
type JoinWaitlistRequest = {
  gameIds: string[] // one or many game UUIDs
  notes?: string
}
```

The route ensures the games belong to the room, validates activity, and creates
individual `waitlist_entries` with `status: 'calledin'`.

#### POST /api/rooms/[room]/waitlist/cancel

Players can remove themselves by submitting the entry id:

```typescript
type CancelWaitlistRequest = {
  entryId: string
}
```

The handler verifies ownership before marking the record as `cancelled`.

#### POST /api/rooms/[room]/waitlist/[id]/status

Operators update statuses through this single endpoint. Valid status transitions
mirror `WaitlistStatusManager`:

```typescript
type UpdateStatusRequest = {
  status:
    | 'waiting'
    | 'calledin'
    | 'notified'
    | 'cancelled'
    | 'seated'
    | 'expired'
  notes?: string
  cancelledBy?: 'player' | 'staff' | 'system'
}
```

`GET /api/rooms/[room]/waitlist/[id]/status` returns a single entry for use in
operator detail dialogs.

#### Reordering endpoints

The admin console calls dedicated endpoints for fractional-position updates:

- `POST /api/rooms/[room]/waitlist/[id]/move-up`
- `POST /api/rooms/[room]/waitlist/[id]/move-down`
- `POST /api/rooms/[room]/waitlist/[id]/move-to-top`
- `POST /api/rooms/[room]/waitlist/[id]/move-to-bottom`

Each route requires operator access and delegates to `WaitlistPositionManager`.

#### GET /api/rooms/[room]/waitlist/[id]/position

Returns the current fractional index for a specific waitlist entry. The admin UI
uses this to show exact placement when reviewing an entry.

#### POST /api/rooms/[room]/waitlist/expiry/process

Triggers the expiry sweep for the specified room. Operators can run this to
force a manual pass of the expiry logic (called automatically in the UI's
"Process Expiries" action).

#### GET /api/rooms/[room]/waitlist/analytics

Provides high-level metrics (status breakdowns, hourly distribution, conversion
rate, etc.) for the selected room. Supports optional `timeRange`, `gameId`,
`startDate`, and `endDate` query parameters. Used by the waitlist analytics
dashboard in the admin area.

## Workflow Scenarios

### 1. Remote Call-in Workflow

1. **Player calls in via mobile app**
   - Selects game(s) from available options
   - Option to join multiple games
   - Entry created with status `calledin`

2. **Staff receives notification**
   - Player appears in waitlist with "Call-in" indicator
   - Shows countdown timer (90 minutes default)

3. **Staff actions**
   - **Check In**: Move to `waiting` status
   - **Cancel**: Move to `cancelled` status
   - **Direct Seat**: Skip to `seated` if seat available

4. **Expiry handling**
   - System automatically moves to `expired` after time limit
   - Moved to voided section with reason "Did not check in"

### 2. In-person Check-in Workflow

1. **Player arrives at poker desk**
   - Staff searches for active player or enters alias
   - Selects game(s) from available options

2. **Check-in options**
   - **Immediate check-in**: Status set to `waiting`
   - **Deferred check-in**: Status set to `calledin`

3. **Staff actions**
   - Same as remote call-in workflow
   - Can seat immediately if seat available

### 3. Multi-game Player Workflow

1. **Player joins multiple games**
   - System tracks all entries in `other_game_entries` array
   - Shows indicator for multi-game players

2. **Seating player**
   - **Keep other entries**: Player stays on other waitlists
   - **Remove other entries**: Player removed from other waitlists

3. **Notification handling**
   - Player can be notified for any of their games
   - Staff can choose which game to seat them for

### 4. Notification and Seating Workflow

1. **Seat becomes available**
   - System identifies next player in queue
   - Staff can notify player or seat directly

2. **Player notification**
   - Status changes to `notified`
   - Countdown timer starts (5 minutes default)
   - Player receives notification (if implemented)

3. **Player response**
   - **Arrives**: Staff seats player
   - **Doesn't arrive**: System moves to `expired`
   - **Cancels**: Staff cancels entry

4. **Grace period**
   - Additional 2 minutes after notification expiry
   - Player can still be seated if they arrive

## Time Management

### Configurable Time Limits

```typescript
interface RoomSettings {
  call_in_expiry_minutes: number // Default: 90
  notify_expiry_minutes: number // Default: 5
  grace_period_minutes: number // Default: 2
}
```

### Expiry Reasons

```typescript
type ExpiryReason =
  | 'did_not_check_in' // Called in but never checked in
  | 'did_not_show' // Notified but didn't arrive
  | 'cancelled' // Cancelled by player or staff
```

### Automatic Expiry Processing

```typescript
// Background job to process expiries
const processExpiredEntries = async (roomId: string) => {
  const settings = await getRoomSettings(roomId)
  const now = new Date()

  // Process called-in entries
  await supabase
    .from('waitlist_entries')
    .update({
      status: 'expired',
      cancelled_at: now,
      cancelled_by: 'system',
    })
    .eq('room_id', roomId)
    .eq('status', 'calledin')
    .lt(
      'created_at',
      new Date(now.getTime() - settings.call_in_expiry_minutes * 60000)
    )

  // Process notified entries
  await supabase
    .from('waitlist_entries')
    .update({
      status: 'expired',
      cancelled_at: now,
      cancelled_by: 'system',
    })
    .eq('room_id', roomId)
    .eq('status', 'notified')
    .lt(
      'notified_at',
      new Date(
        now.getTime() -
          (settings.notify_expiry_minutes + settings.grace_period_minutes) *
            60000
      )
    )
}
```

## Real-time Updates

### Supabase Subscriptions

```typescript
// Subscribe to waitlist changes
const subscription = supabase
  .channel(`waitlist-${roomId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'waitlist_entries',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      // Update UI based on change
      handleWaitlistUpdate(payload)
    }
  )
  .subscribe()
```

### Real-time Features

- Live position updates
- Status change notifications
- Countdown timer updates
- New entry notifications
- Expiry notifications

## Security and Permissions

### Role-based Access

- **Admin**: Full waitlist management
- **Supervisor**: Can manage waitlist, seat players
- **Dealer**: Can check in players, basic operations

### Data Validation

- Validate player exists and is active
- Check game availability
- Verify seat availability before seating
- Validate time limits and expiry rules

## Performance Considerations

### Database Indexes

```sql
-- Primary indexes
CREATE INDEX idx_waitlist_entries_room_status ON waitlist_entries(room_id, status);
CREATE INDEX idx_waitlist_entries_position ON waitlist_entries(game_id, status, position);
CREATE INDEX idx_waitlist_entries_player ON waitlist_entries(player_id, status);

-- Composite indexes for common queries
CREATE INDEX idx_waitlist_entries_room_game_status ON waitlist_entries(room_id, game_id, status);
CREATE INDEX idx_waitlist_entries_expiry ON waitlist_entries(room_id, status, created_at, notified_at);
```

### Caching Strategy

- Cache room settings
- Cache active games list
- Cache player search results
- Use Redis for real-time data

## Future Enhancements

### Planned Features

1. **Mobile Notifications**
   - Push notifications for seat availability
   - SMS notifications as backup
   - Email notifications for VIPs

2. **Analytics Dashboard**
   - Average wait times by game
   - Player behavior analytics
   - Staff performance metrics

3. **Advanced Features**
   - VIP priority system
   - Automatic seat assignment
   - Waitlist predictions
   - Player preferences

4. **Integration Features**
   - Tournament waitlist integration
   - Loyalty program integration
   - Payment system integration

### Technical Improvements

1. **Performance**
   - Database query optimization
   - Real-time subscription optimization
   - Caching improvements

2. **User Experience**
   - Drag-and-drop reordering
   - Bulk operations
   - Keyboard shortcuts

3. **Reliability**
   - Error handling improvements
   - Data consistency checks
   - Backup and recovery procedures
