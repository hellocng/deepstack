import type { User, PlayerUser, OperatorUser } from './user-context'

/**
 * Type guard to check if user is a player
 */
export function isPlayerUser(user: User | null): user is PlayerUser {
  return user?.type === 'player'
}

/**
 * Type guard to check if user is an operator
 */
export function isOperatorUser(user: User | null): user is OperatorUser {
  return user?.type === 'operator'
}

/**
 * Type guard to check if user is a superadmin
 */
export function isSuperAdmin(user: User | null): boolean {
  return isOperatorUser(user) && user.profile.role === 'superadmin'
}

/**
 * Type guard to check if user is a room admin (admin or supervisor)
 */
export function isRoomAdmin(user: User | null): boolean {
  return (
    isOperatorUser(user) &&
    ['admin', 'supervisor'].includes(user.profile.role) &&
    !!user.room
  )
}

/**
 * Type guard to check if user is a dealer
 */
export function isDealer(user: User | null): boolean {
  return isOperatorUser(user) && user.profile.role === 'dealer'
}

/**
 * Type guard to check if user has any admin privileges
 */
export function hasAdminPrivileges(user: User | null): boolean {
  return isSuperAdmin(user) || isRoomAdmin(user)
}

/**
 * Type guard to check if user can manage operators
 */
export function canManageOperators(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    (isOperatorUser(user) && user.profile.role === 'admin')
  )
}

/**
 * Type guard to check if user can manage games
 */
export function canManageGames(user: User | null): boolean {
  return hasAdminPrivileges(user) || isDealer(user)
}

/**
 * Type guard to check if user can manage tournaments
 */
export function canManageTournaments(user: User | null): boolean {
  return hasAdminPrivileges(user)
}

/**
 * Type guard to check if user can view player data
 */
export function canViewPlayerData(user: User | null): boolean {
  return hasAdminPrivileges(user) || isDealer(user)
}
