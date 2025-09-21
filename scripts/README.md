# DeepStack Seeding Scripts

This directory contains scripts for seeding the DeepStack database with test data.

## Player Seeding

### Overview
The player seeding script creates 50 realistic poker players with:
- Phone-based authentication (auto-confirmed)
- Realistic poker aliases
- Optional avatar images
- Default preferences

### Prerequisites

1. **Environment Variables**: Ensure you have the following environment variables set:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install
   ```

### Usage

Run the player seeding script:
```bash
npm run seed:players
```

Or run directly with tsx:
```bash
npx tsx scripts/seed-players.ts
```

### What Gets Created

For each player, the script creates:

1. **Auth User** (`auth.users` table):
   - Phone number (auto-confirmed)
   - User metadata with alias and seeded flag
   - Phone-based authentication ready

2. **Player Record** (`public.players` table):
   - Link to auth user
   - Poker alias
   - Optional avatar URL
   - Default preferences (notifications, theme, language)

### Player Data

The script generates:
- **50 unique poker aliases** from a curated list of realistic poker terms
- **Unique phone numbers** in US format (+1XXXXXXXXXX)
- **30% chance** of having an avatar image
- **Default preferences** for notifications, theme, and language

### Sample Aliases
- AceHigh, RiverRat, PocketRocket, BluffMaster, CardShark
- AllInAndy, PokerFace, RoyalFlush, StraightShooter, FlushDraw
- And many more realistic poker-themed names

### Error Handling

The script includes comprehensive error handling:
- Validates environment variables
- Tests database connection
- Handles auth user creation failures
- Cleans up failed player records
- Provides detailed progress reporting
- Shows summary of successful/failed creations

### Safety Features

- **Environment validation** before running
- **Database connection testing**
- **Atomic operations** (auth user + player record)
- **Cleanup on failure** (removes auth user if player creation fails)
- **Rate limiting** (100ms delay between creations)
- **Detailed logging** and progress tracking

### Output Example

```
🚀 DeepStack Player Seeding Script
=====================================

✅ Environment validation passed

🎯 Starting to seed 50 players...
📱 Using phone-based authentication
🎲 Generating realistic poker player data

📋 Generated 50 unique players

[1/50] Creating AceHigh (+15551234567)... ✅
[2/50] Creating RiverRat (+15551234568)... ✅
[3/50] Creating PocketRocket (+15551234569)... ✅
...

📊 Seeding Summary:
✅ Successful: 50
❌ Failed: 0

🎉 Player seeding completed!

📝 Next steps:
   • Players can now sign in using their phone numbers
   • All players have confirmed phone numbers
   • Players have realistic poker aliases
   • Some players have avatar images
```

### Troubleshooting

**Common Issues:**

1. **Missing environment variables**:
   ```
   ❌ Missing required environment variables:
      • SUPABASE_URL
      • SUPABASE_SERVICE_ROLE_KEY
   ```
   Solution: Set the required environment variables

2. **Database connection failed**:
   ```
   ❌ Database connection failed: Invalid API key
   ```
   Solution: Check your SUPABASE_SERVICE_ROLE_KEY

3. **Phone number already exists**:
   ```
   Error: Auth error: User already registered
   ```
   Solution: The script ensures uniqueness, but if you run it multiple times, you may get conflicts

### Development Notes

- Uses `@faker-js/faker` for realistic data generation
- Uses `tsx` for TypeScript execution
- Includes TypeScript types and proper error handling
- Follows DeepStack coding standards
- Includes comprehensive logging and progress tracking

### Security Notes

- **Never run in production** without careful consideration
- Uses service role key (bypasses RLS)
- Creates test data only
- All players are marked as "seeded" in metadata
- Phone numbers are auto-confirmed for testing purposes
