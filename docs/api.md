# DeepStack API Documentation

## Overview

The poker room management system uses Next.js API routes with Supabase for backend functionality. All API endpoints are tenant-aware and include proper authentication and authorization.

## Authentication

### Supabase Auth Integration
All API routes use Supabase authentication. The user must be authenticated and have access to the specified tenant.

```typescript
// lib/auth/api-auth.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireTenantAccess(
  request: NextRequest, 
  tenantCode: string
) {
  const user = await getAuthenticatedUser(request)
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()
  
  if (!userData || userData.tenant_id !== tenantCode) {
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
├── [tenant]/
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

### GET /api/[tenant]/games
Get all games for a tenant.

**Parameters:**
- `tenant` (path): Tenant code

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
  tenant_id: string
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

### POST /api/[tenant]/games
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

### PUT /api/[tenant]/games/[id]
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

### DELETE /api/[tenant]/games/[id]
Delete a game (Admin/Operator only).

**Response:**
```typescript
{
  "message": "Game deleted successfully"
}
```

## Tables API

### GET /api/[tenant]/tables
Get all tables for a tenant.

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
  tenant_id: string
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

### POST /api/[tenant]/tables
Create a new table (Admin/Operator only).

**Request Body:**
```typescript
interface CreateTableRequest {
  name: string
  game_id?: string
  seat_count: number
}
```

### PUT /api/[tenant]/tables/[id]
Update a table (Admin/Operator only).

### GET /api/[tenant]/tables/[id]/seats
Get seats for a specific table.

### POST /api/[tenant]/tables/[id]/seats
Assign a player to a seat (Admin/Operator only).

**Request Body:**
```typescript
interface AssignSeatRequest {
  seat_number: number
  user_id: string
}
```

## Waitlist API

### GET /api/[tenant]/waitlist
Get waitlist entries for a tenant.

**Query Parameters:**
- `game_id` (optional): Filter by game ID
- `status` (optional): Filter by status

**Response:**
```typescript
interface WaitlistEntry {
  id: string
  user_id: string
  game_id: string
  position: number
  status: 'waiting' | 'called' | 'seated' | 'cancelled'
  notes?: string
  tenant_id: string
  created_at: string
  updated_at: string
  user: User
  game: Game
}
```

### POST /api/[tenant]/waitlist
Join the waitlist for a game.

**Request Body:**
```typescript
interface JoinWaitlistRequest {
  game_id: string
  notes?: string
}
```

### PUT /api/[tenant]/waitlist/[id]
Update waitlist entry status (Admin/Operator only).

**Request Body:**
```typescript
interface UpdateWaitlistRequest {
  status: 'waiting' | 'called' | 'seated' | 'cancelled'
  notes?: string
}
```

### DELETE /api/[tenant]/waitlist/[id]
Remove from waitlist.

## Tournaments API

### GET /api/[tenant]/tournaments
Get tournaments for a tenant.

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
  status: 'scheduled' | 'registering' | 'in_progress' | 'completed' | 'cancelled'
  prize_pool: number
  rake?: string
  description?: string
  tenant_id: string
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

### POST /api/[tenant]/tournaments
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

### POST /api/[tenant]/tournaments/[id]/register
Register for a tournament.

### PUT /api/[tenant]/tournaments/[id]/checkin
Check in for a tournament.

## Users API

### GET /api/[tenant]/players
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
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  avatar_url?: string
  tenant_id: string
  role: 'admin' | 'supervisor' | 'dealer'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}
```

### GET /api/[tenant]/players/[id]
Get a specific player.

### PUT /api/[tenant]/players/[id]
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

### GET /api/[tenant]/operators
Get operators for a tenant (Admin only).

**Query Parameters:**
- `role` (optional): Filter by operator role
- `active` (optional): Filter by active status

### GET /api/[tenant]/operators/[id]
Get a specific operator.

### POST /api/[tenant]/operators
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

### PUT /api/[tenant]/operators/[id]
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
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tables',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    console.log('Table update:', payload)
  })
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
import handler from '@/app/api/[tenant]/games/route'

describe('/api/[tenant]/games', () => {
  it('should return games for a tenant', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { tenant: 'royal' }
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
              "raw": "{{base_url}}/api/{{tenant}}/games",
              "host": ["{{base_url}}"],
              "path": ["api", "{{tenant}}", "games"]
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
      "key": "tenant",
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
  max_players: z.number().int().min(2).max(10)
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
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
