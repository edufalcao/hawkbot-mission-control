import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (_db) return _db

  const config = useRuntimeConfig()
  const dbPath = config.dbPath || './data/mission-control.db'

  // Ensure directory exists
  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new Database(dbPath)

  // Enable WAL for better performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  _db = drizzle(sqlite, { schema })

  // Run migrations on startup
  runMigrations(sqlite)

  return _db
}

function runMigrations(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      assignee TEXT NOT NULL DEFAULT 'eduardo',
      priority TEXT NOT NULL DEFAULT 'none',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      session_key TEXT,
      dispatched_at TEXT
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'idea',
      script TEXT DEFAULT '',
      thumbnail_path TEXT,
      platforms TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🤖',
      role TEXT NOT NULL,
      model TEXT DEFAULT 'sonnet',
      specialties TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'idle',
      current_task_id TEXT,
      last_used TEXT,
      usage_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      message TEXT NOT NULL,
      task_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `)

  // Additive migrations for existing databases (ALTER TABLE is idempotent via try/catch)
  const alterations = [
    'ALTER TABLE tasks ADD COLUMN session_key TEXT',
    'ALTER TABLE tasks ADD COLUMN dispatched_at TEXT',
    'ALTER TABLE team_members ADD COLUMN member_type TEXT NOT NULL DEFAULT \'agent\''
  ]
  for (const sql of alterations) {
    try {
      sqlite.exec(sql)
    } catch { /* column already exists */ }
  }
}
