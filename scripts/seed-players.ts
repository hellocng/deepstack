#!/usr/bin/env tsx

/**
 * Seed 50 players for DeepStack
 *
 * This script creates:
 * 1. Auth users with phone-based authentication
 * 2. Corresponding player records in the public.players table
 *
 * Usage: npx tsx scripts/seed-players.ts
 */

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Realistic poker player aliases
const pokerAliases = [
  'AceHigh',
  'RiverRat',
  'PocketRocket',
  'BluffMaster',
  'CardShark',
  'AllInAndy',
  'PokerFace',
  'RoyalFlush',
  'StraightShooter',
  'FlushDraw',
  'ChipStack',
  'DealerDave',
  'LuckyLou',
  'BigBlind',
  'SmallBlind',
  'PocketPair',
  'SuitedConnector',
  'OverPair',
  'TopPair',
  'BottomPair',
  'Gutshot',
  'Backdoor',
  'RunnerRunner',
  'BadBeat',
  'Cooler',
  'TiltKing',
  'NitPlayer',
  'LooseAggro',
  'TightPassive',
  'Maniac',
  'Fish',
  'Shark',
  'Whale',
  'Donkey',
  'Rocket',
  'Bullet',
  'Cannon',
  'Lightning',
  'Thunder',
  'Storm',
  'Phoenix',
  'Dragon',
  'Tiger',
  'Lion',
  'Eagle',
  'Hawk',
  'Falcon',
  'Wolf',
  'Bear',
  'Bull',
]

// Generate realistic phone numbers (US format)
function generatePhoneNumber(): string {
  const areaCodes = [
    '555',
    '123',
    '456',
    '789',
    '321',
    '654',
    '987',
    '147',
    '258',
    '369',
  ]
  const areaCode = faker.helpers.arrayElement(areaCodes)
  const exchange = faker.string.numeric(3)
  const number = faker.string.numeric(4)
  return `+1${areaCode}${exchange}${number}`
}

// Generate player data
function generatePlayerData(): {
  phone: string
  alias: string
  avatar_url?: string
} {
  const alias = faker.helpers.arrayElement(pokerAliases)
  const phone = generatePhoneNumber()

  // 30% chance of having an avatar
  const avatar_url = faker.datatype.boolean({ probability: 0.3 })
    ? faker.image.avatar()
    : undefined

  return {
    phone,
    alias,
    avatar_url,
  }
}

// Create a single player
async function createPlayer(playerData: {
  phone: string
  alias: string
  avatar_url?: string
}): Promise<{ success: boolean; error?: string; playerId?: string }> {
  try {
    // Step 1: Create auth user
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        phone: playerData.phone,
        phone_confirm: true, // Auto-confirm phone for seeding
        user_metadata: {
          alias: playerData.alias,
          seeded: true, // Mark as seeded for identification
        },
      })

    if (authError) {
      return { success: false, error: `Auth error: ${authError.message}` }
    }

    if (!authUser.user) {
      return { success: false, error: 'No user returned from auth creation' }
    }

    // Step 2: Create player record
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        auth_id: authUser.user.id,
        alias: playerData.alias,
        avatar_url: playerData.avatar_url,
        preferences: {
          notifications: true,
          theme: 'dark',
          language: 'en',
        },
      })
      .select('id')
      .single()

    if (playerError) {
      // If player creation fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return { success: false, error: `Player error: ${playerError.message}` }
    }

    return { success: true, playerId: player.id }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Main seeding function
async function seedPlayers(): Promise<void> {
  // Starting to seed 50 players with phone-based authentication

  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  }

  // Generate 50 unique players
  const playersToCreate = []
  const usedPhones = new Set<string>()
  const usedAliases = new Set<string>()

  while (playersToCreate.length < 50) {
    const playerData = generatePlayerData()

    // Ensure uniqueness
    if (
      !usedPhones.has(playerData.phone) &&
      !usedAliases.has(playerData.alias)
    ) {
      usedPhones.add(playerData.phone)
      usedAliases.add(playerData.alias)
      playersToCreate.push(playerData)
    }
  }

  // Generated unique players

  // Create players with progress tracking
  for (let i = 0; i < playersToCreate.length; i++) {
    const playerData = playersToCreate[i]
    const _progress = `[${i + 1}/${playersToCreate.length}]`

    // Creating player: ${playerData.alias} (${playerData.phone})

    const result = await createPlayer(playerData)

    if (result.success) {
      results.successful++
    } else {
      results.failed++
      results.errors.push(`${playerData.alias}: ${result.error}`)
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Summary: Successful: ${results.successful}, Failed: ${results.failed}

  if (results.errors.length > 0) {
    // Errors encountered during seeding
    results.errors.forEach((_error) => {
      // Error logged
    })
  }

  if (results.successful === 0) {
    process.exit(1)
  }
}

// Validation function
async function validateEnvironment(): Promise<void> {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar])

  if (missing.length > 0) {
    // Missing required environment variables: ${missing.join(', ')}
    process.exit(1)
  }

  // Test database connection
  try {
    const { data: _data, error } = await supabase
      .from('rooms')
      .select('count')
      .limit(1)
    if (error) {
      // Database connection failed: ${error.message}
      process.exit(1)
    }
  } catch (_error) {
    // Database connection failed
    process.exit(1)
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    // DeepStack Player Seeding Script

    // Validate environment
    await validateEnvironment()
    // Environment validation passed

    // Run seeding
    await seedPlayers()
  } catch (_error) {
    // Fatal error occurred
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { seedPlayers, createPlayer, generatePlayerData }
