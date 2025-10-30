# DeepStack API Documentation

## Overview

The poker room management system uses Next.js API routes with Supabase for backend functionality. All API endpoints are room-aware and include proper authentication and authorization.

## Authentication

### Supabase Auth Integration

All API routes use Supabase authentication. The user must be authenticated and have access to the specified room.

```typescript
// lib/auth/api-auth.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireRoomAccess(
  request: NextRequest,
  roomCode: string
) {
  const user = await getAuthenticatedUser(request)
  const supabase = createRouteHandlerClient({ cookies })

  const { data: userData } = await supabase
    .from('operators')
    .select('room_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!userData || userData.room_id !== roomCode) {
    throw new Error('Access denied')
  }

  return { user, userData }
}
```

## API Routes Structure

### Route Organization

```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── callback/route.ts
├── [room]/
│   ├── games/
│   │   ├── route.ts          # GET, POST
│   │   └── [id]/route.ts     # GET, PUT, DELETE
│   ├── tables/
│   │   ├── route.ts          # GET, POST
│   │   ├── [id]/route.ts     # GET, PUT, DELETE
│   │   └── [id]/seats/route.ts
│   ├── waitlist/
│   │   ├── route.ts          # GET, POST
│   │   └── [id]/route.ts     # PUT, DELETE
│   ├── tournaments/
│   │   ├── route.ts          # GET, POST
│   │   └── [id]/route.ts     # GET, PUT, DELETE
│   └── users/
│       ├── route.ts          # GET
│       └── [id]/route.ts     # GET, PUT
```

## Games API

### GET /api/[room]/games

Get all games for a room.

**Parameters:**

- `room` (path): Room code

**Query Parameters:**

- `active` (optional): Filter by active status (default: true)
- `game_type` (optional): Filter by game type

**Response:**

```typescript
interface Game {
  id: string
  name: string
  game_type: 'texas_holdem' | 'omaha' | 'seven_card_stud' | 'five_card_draw' | 'razz' | 'stud_hi_lo'
  buy_in: number
  max_players: number
  rake?: string
  description?: string
  room_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Response
{
  "data": Game[],
  "count": number
}
```

**Example:**

```bash
GET /api/royal/games?active=true&game_type=texas_holdem
```

### POST /api/[room]/games

Create a new game (Admin/Operator only).

**Request Body:**

```typescript
interface CreateGameRequest {
  name: string
  game_type: string
  buy_in: number
  max_players: number
  rake?: string
  description?: string
}
```

**Response:**

```typescript
{
  "data": Game,
  "message": "Game created successfully"
}
```

### PUT /api/[room]/games/[id]

Update a game (Admin/Operator only).

**Request Body:**

```typescript
interface UpdateGameRequest {
  name?: string
  buy_in?: number
  max_players?: number
  rake?: string
  description?: string
  is_active?: boolean
}
```

### DELETE /api/[room]/games/[id]

Delete a game (Admin/Operator only).

**Response:**

```typescript
{
  "message": "Game deleted successfully"
}
```

## Tables API

### GET /api/[room]/tables

Get all tables for a room.

**Query Parameters:**

- `status` (optional): Filter by table status
- `game_id` (optional): Filter by game ID

**Response:**

```typescript
interface Table {
  id: string
  name: string
  game_id?: string
  seat_count: number
  current_players: number
  status: 'available' | 'occupied' | 'maintenance' | 'closed'
  room_id: string
  created_at: string
  updated_at: string
  game?: Game
  seats?: TableSeat[]
}

interface TableSeat {
  id: string
  table_id: string
  seat_number: number
  user_id?: string
  is_occupied: boolean
  user?: User
}
```

### POST /api/[room]/tables

Create a new table (Admin/Operator only).

**Request Body:**

```typescript
interface CreateTableRequest {
  name: string
  game_id?: string
  seat_count: number
}
```

### PUT /api/[room]/tables/[id]

Update a table (Admin/Operator only).

### GET /api/[room]/tables/[id]/seats

Get seats for a specific table.

### POST /api/[room]/tables/[id]/seats

Assign a player to a seat (Admin/Operator only).

**Request Body:**

```typescript
interface AssignSeatRequest {
  seat_number: number
  user_id: string
}
```

## Waitlist API

### GET /api/rooms/[room]/waitlist/status

Return the authenticated player's waitlist entries for a room. Results are
limited to `waiting`, `calledin`, and `notified` statuses and are sorted by
position.

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

### POST /api/rooms/[room]/waitlist/join

Create waitlist entries for the signed-in player.

```typescript
type JoinWaitlistRequest = {
  gameIds: string[]
  notes?: string
}

type JoinWaitlistResponse = {
  success: boolean
  entries: Array<{
    id: string
    game_id: string
    status: 'calledin'
    created_at: string
  }>
  message: string
}
```

### POST /api/rooms/[room]/waitlist/cancel

Allow players to opt out of a waitlist entry they created.

```typescript
type CancelWaitlistRequest = {
  entryId: string
}

type CancelWaitlistResponse = {
  success: boolean
  message: string
}
```

### GET /api/rooms/[room]/waitlist/[id]/status

Fetch a single waitlist entry (used by the operator detail dialog). Requires
operator access to the room.

### POST /api/rooms/[room]/waitlist/[id]/status

Update a waitlist entry's status. Valid transitions are enforced by
`WaitlistStatusManager`.

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

### Reordering Endpoints

Operators can adjust fractional positions with the following endpoints:

- `POST /api/rooms/[room]/waitlist/[id]/move-up`
- `POST /api/rooms/[room]/waitlist/[id]/move-down`
- `POST /api/rooms/[room]/waitlist/[id]/move-to-top`
- `POST /api/rooms/[room]/waitlist/[id]/move-to-bottom`

### GET /api/rooms/[room]/waitlist/[id]/position

Returns the current fractional index for a waitlist entry. Requires operator
access. Example response:

```typescript
type WaitlistPositionResponse = {
  position: number
}
```

### POST /api/rooms/[room]/waitlist/auto-assign

Assign the next player in line to an available seat for the specified game. The
request body mirrors the admin "Auto Assign" action:

```typescript
type AutoAssignRequest = {
  gameId: string
  assignedBy: string
}
```

### POST /api/rooms/[room]/waitlist/expiry/process

Run the expiry sweep for a room. Operators can trigger this manually in
addition to the scheduled background job handled by the UI.

### GET /api/rooms/[room]/waitlist/analytics

Return aggregated waitlist metrics for the specified room. Query parameters:

- `timeRange`: `'24h' | '7d' | '30d'` (default `7d`)
- `gameId`: optional UUID to scope results to a single game
- `startDate` / `endDate`: ISO strings overriding `timeRange`

The response includes counts by status, hourly/daily distributions, conversion
rates, and top games, matching the admin analytics dashboard.

## Tournaments API

### GET /api/[room]/tournaments

Get tournaments for a room.

**Query Parameters:**

- `status` (optional): Filter by tournament status
- `upcoming` (optional): Get only upcoming tournaments

**Response:**

```typescript
interface Tournament {
  id: string
  name: string
  game_type: string
  buy_in: number
  max_players: number
  start_time: string
  status:
    | 'scheduled'
    | 'registering'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  prize_pool: number
  rake?: string
  description?: string
  room_id: string
  created_at: string
  updated_at: string
  entries?: TournamentEntry[]
}

interface TournamentEntry {
  id: string
  tournament_id: string
  user_id: string
  position?: number
  prize_amount: number
  status: 'registered' | 'checked_in' | 'eliminated' | 'finished'
  user: User
}
```

### POST /api/[room]/tournaments

Create a new tournament (Admin/Operator only).

**Request Body:**

```typescript
interface CreateTournamentRequest {
  name: string
  game_type: string
  buy_in: number
  max_players: number
  start_time: string
  rake?: string
  description?: string
}
```

### POST /api/[room]/tournaments/[id]/register

Register for a tournament.

### PUT /api/[room]/tournaments/[id]/checkin

Check in for a tournament.

## Users API

### GET /api/[room]/players

Get players (Admin/Operator only).

**Query Parameters:**

- `active` (optional): Filter by active status

**Response:**

```typescript
interface Player {
  id: string
  phone_number: string
  alias: string
  avatar_url?: string
  email?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

interface Operator {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  avatar_url?: string
  room_id: string
  role: 'admin' | 'supervisor' | 'dealer'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}
```

### GET /api/[room]/players/[id]

Get a specific player.

### PUT /api/[room]/players/[id]

Update player profile.

**Request Body:**

```typescript
interface UpdatePlayerRequest {
  alias?: string
  avatar_url?: string
  email?: string
}
```

## Operators API

### GET /api/[room]/operators

Get operators for a room (Admin only).

**Query Parameters:**

- `role` (optional): Filter by operator role
- `active` (optional): Filter by active status

### GET /api/[room]/operators/[id]

Get a specific operator.

### POST /api/[room]/operators

Create a new operator (Admin only).

**Request Body:**

```typescript
interface CreateOperatorRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone_number?: string
  role: 'admin' | 'supervisor' | 'dealer'
}
```

### PUT /api/[room]/operators/[id]

Update operator profile (Admin only).

**Request Body:**

```typescript
interface UpdateOperatorRequest {
  first_name?: string
  last_name?: string
  phone_number?: string
  avatar_url?: string
  role?: 'admin' | 'supervisor' | 'dealer'
  is_active?: boolean
}
```

## Real-time API

### WebSocket Connection

The system uses Supabase real-time for live updates.

**Connection:**

```typescript
import { supabase } from '@/lib/supabase/client'

// Subscribe to table updates
const subscription = supabase
  .channel('table_updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tables',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      console.log('Table update:', payload)
    }
  )
  .subscribe()
```

**Channels:**

- `table_updates`: Table status changes
- `waitlist_updates`: Waitlist changes
- `tournament_updates`: Tournament updates
- `user_activity`: User online/offline status

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    message: string
    code?: string
    details?: any
  }
  status: number
}
```

### Common Error Codes

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Validation Error
- `500`: Internal Server Error

### Example Error Response

```json
{
  "error": {
    "message": "Game not found",
    "code": "GAME_NOT_FOUND"
  },
  "status": 404
}
```

## Rate Limiting

### Implementation

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  const ip = request.ip || 'unknown'
  const now = Date.now()
  const windowStart = now - windowMs

  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key)
    }
  }

  const current = rateLimitMap.get(ip)

  if (!current) {
    rateLimitMap.set(ip, { count: 1, resetTime: now })
    return { success: true, remaining: limit - 1 }
  }

  if (current.count >= limit) {
    return { success: false, remaining: 0 }
  }

  current.count++
  return { success: true, remaining: limit - current.count }
}
```

## API Testing

### Test Setup

```typescript
// __tests__/api/games.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/[room]/games/route'

describe('/api/[room]/games', () => {
  it('should return games for a room', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { room: 'royal' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toHaveProperty('data')
  })
})
```

### Postman Collection

```json
{
  "info": {
    "name": "Poker Room API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Games",
      "item": [
        {
          "name": "Get Games",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/{{room}}/games",
              "host": ["{{base_url}}"],
              "path": ["api", "{{room}}", "games"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "room",
      "value": "royal"
    }
  ]
}
```

## Security Considerations

### Input Validation

```typescript
import { z } from 'zod'

const createGameSchema = z.object({
  name: z.string().min(1).max(100),
  game_type: z.enum(['texas_holdem', 'omaha', 'seven_card_stud']),
  buy_in: z.number().positive(),
  max_players: z.number().int().min(2).max(10),
})

export function validateCreateGame(data: unknown) {
  return createGameSchema.parse(data)
}
```

### CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}
```

### API Key Authentication (Optional)

```typescript
// For external API access
export function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.API_KEY) {
    throw new Error('Invalid API key')
  }
}
```
