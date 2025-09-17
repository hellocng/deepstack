// Re-export types from database
export type {
  Tables,
  TablesUpdate,
  TablesInsert,
  Database,
  Json,
} from './database'
import type { Tables } from './database'

// Type aliases for common types
export type Room = Tables<'rooms'>
export type Player = Tables<'players'>
export type Operator = Tables<'operators'>
export type Game = Tables<'games'>
export type Tournament = Tables<'tournaments'>
export type Table = Tables<'tables'>
export type WaitlistEntry = Tables<'waitlist_entries'>
