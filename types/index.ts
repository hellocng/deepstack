// Re-export types from supabase
export type { Tables, TablesUpdate, TablesInsert } from './supabase'
import type { Tables } from './supabase'

// Type aliases for common types
export type Room = Tables<'rooms'>
export type Player = Tables<'players'>
export type Operator = Tables<'operators'>
export type Game = Tables<'games'>
export type Tournament = Tables<'tournaments'>
export type Table = Tables<'tables'>
export type WaitlistEntry = Tables<'waitlist_entries'>
