# Waitlist Position Management System

## Overview

The waitlist position management system uses **fractional indexing** to enable arbitrary reordering of waitlist entries without cascading updates. This system allows operators to:

- Move players up or down in the waitlist
- Insert players at specific positions
- Reorder players based on priority or special circumstances
- Maintain real-time updates across all clients

## Architecture

### Database Schema

```sql
-- Position column added to waitlist_entries table
ALTER TABLE waitlist_entries
ADD COLUMN position DECIMAL(20,10) DEFAULT EXTRACT(EPOCH FROM NOW());

-- Index for efficient ordering
CREATE INDEX idx_waitlist_entries_position
ON waitlist_entries(game_id, status, position);
```

### Fractional Indexing

The system uses decimal precision to insert entries between existing positions:

- **New entries**: Get position = `EXTRACT(EPOCH FROM NOW())` (timestamp)
- **Insert at position**: Calculate position between two existing entries
- **Move up/down**: Recalculate position between neighbors
- **No cascading updates**: Only the moved entry needs updating

## Components

### 1. WaitlistPositionManager

Core utility class for position management:

```typescript
import { WaitlistPositionManager } from '@/lib/waitlist-position-manager'

// Move entry up by one position
await WaitlistPositionManager.moveUp(entryId)

// Move entry down by one position
await WaitlistPositionManager.moveDown(entryId)

// Move entry to top/bottom
await WaitlistPositionManager.moveToTop(entryId)
await WaitlistPositionManager.moveToBottom(entryId)

// Insert new entry at specific position
await WaitlistPositionManager.insertAtPosition(gameId, playerId, roomId, 2)
```

### 2. UI Components

#### WaitlistReorderButtons

Simple reorder buttons for basic operations:

```typescript
import { WaitlistReorderButtons } from '@/components/admin/waitlist-reorder-buttons'

<WaitlistReorderButtons
  entryId={entry.id}
  onReorder={refetch}
/>
```

### 3. Real-time Updates

Custom hook for real-time waitlist updates:

```typescript
import { useWaitlistRealtime } from '@/lib/hooks/use-waitlist-realtime'

const { entries, loading, refetch } = useWaitlistRealtime({
  roomId: operator.profile.room_id,
  onUpdate: (entries) => {
    console.log('Waitlist updated:', entries.length, 'entries')
  },
})
```

## API Endpoints

### Move Operations

- `POST /api/rooms/[room]/waitlist/[id]/move-up` - Move entry up
- `POST /api/rooms/[room]/waitlist/[id]/move-down` - Move entry down
- `POST /api/rooms/[room]/waitlist/[id]/move-to-top` - Move to top
- `POST /api/rooms/[room]/waitlist/[id]/move-to-bottom` - Move to bottom

### Position Information

- `GET /api/rooms/[room]/waitlist/[id]/position` - Get current position

## Usage Examples

### Basic Reordering

```typescript
// Move a player up in the waitlist
const handleMoveUp = async (entryId: string) => {
  const response = await fetch(
    `/api/rooms/${roomId}/waitlist/${entryId}/move-up`,
    {
      method: 'POST',
    }
  )

  if (response.ok) {
    toast.success('Player moved up')
    refetch() // Refresh the waitlist
  }
}
```

### Insert at Specific Position

```typescript
// Insert a VIP player at position 2
const handleInsertVIP = async (playerId: string) => {
  const response = await fetch(
    `/api/rooms/${roomId}/waitlist/insert-at-position`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        player_id: playerId,
        position: 2,
        notes: 'VIP player',
      }),
    }
  )
}
```

### Real-time Updates

```typescript
// Component automatically updates when waitlist changes
function WaitlistPage() {
  const { entries, loading } = useWaitlistRealtime({
    roomId: operator.profile.room_id
  })

  return (
    <div>
      {entries.map((entry, index) => (
        <WaitlistEntry
          key={entry.id}
          entry={entry}
          position={index + 1}
        />
      ))}
    </div>
  )
}
```

## Migration from Created_at System

### Before (Created_at)

```typescript
// Old system - rigid ordering
.order('created_at', { ascending: true })
```

### After (Position)

```typescript
// New system - flexible ordering
.order('position', { ascending: true })
```

### Data Migration

Existing entries are automatically migrated:

```sql
-- Populate existing entries with positions based on created_at
UPDATE waitlist_entries
SET position = EXTRACT(EPOCH FROM created_at) * 1000000
WHERE position IS NULL;
```

## Benefits

### Performance

- ✅ **No cascading updates** - Only one record changes per operation
- ✅ **Efficient queries** - Single index, fast ordering
- ✅ **Real-time friendly** - Works with Supabase subscriptions

### Flexibility

- ✅ **Arbitrary reordering** - Insert/move anywhere
- ✅ **VIP management** - Move important players up
- ✅ **Priority handling** - Handle special circumstances

### User Experience

- ✅ **Real-time updates** - All clients see changes immediately
- ✅ **Intuitive UI** - Drag & drop, buttons, dropdowns
- ✅ **Visual feedback** - Position numbers, status indicators

## Best Practices

### 1. Use Position for Active Entries

```typescript
// Only use position for active waitlist entries
.eq('status', 'waiting')
.order('position', { ascending: true })
```

### 2. Handle Edge Cases

```typescript
// Check if entry can be moved before attempting
const canMoveUp = await WaitlistPositionManager.canMoveUp(entryId)
if (!canMoveUp) {
  toast.error('Entry is already at the top')
  return
}
```

### 3. Provide User Feedback

```typescript
// Show loading states and success messages
const [loading, setLoading] = useState(false)

const handleMove = async () => {
  setLoading(true)
  try {
    await moveEntry()
    toast.success('Entry moved successfully')
  } catch (error) {
    toast.error('Failed to move entry')
  } finally {
    setLoading(false)
  }
}
```

### 4. Real-time Subscriptions

```typescript
// Subscribe to changes for the specific room
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
      refetch() // Refresh data
    }
  )
  .subscribe()
```

## Troubleshooting

### Common Issues

1. **Position not updating**
   - Check if the entry exists and has the correct game_id
   - Verify the user has operator permissions
   - Check for database constraints

2. **Real-time not working**
   - Ensure Supabase real-time is enabled
   - Check the subscription filter matches the room_id
   - Verify the user is authenticated

3. **UI not reflecting changes**
   - Call `refetch()` after position changes
   - Check if the component is using the real-time hook
   - Verify the position field is included in queries

### Debug Tools

```typescript
// Check current position
const position = await WaitlistPositionManager.getPosition(entryId)
console.log('Current position:', position)

// Check if entry can be moved
const canMoveUp = await WaitlistPositionManager.canMoveUp(entryId)
const canMoveDown = await WaitlistPositionManager.canMoveDown(entryId)
console.log('Can move up:', canMoveUp, 'Can move down:', canMoveDown)
```

## Future Enhancements

- **Bulk operations** - Move multiple entries at once
- **Position history** - Track position changes over time
- **Auto-prioritization** - Automatic VIP handling
- **Position analytics** - Average wait times by position
- **Mobile optimization** - Touch-friendly drag & drop
