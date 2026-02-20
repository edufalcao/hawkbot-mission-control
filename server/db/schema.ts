import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Tasks Board
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  status: text('status', { enum: ['todo', 'in_progress', 'review', 'done'] }).notNull().default('todo'),
  assignee: text('assignee', { enum: ['eduardo', 'hawkbot'] }).notNull().default('eduardo'),
  priority: text('priority', { enum: ['high', 'medium', 'low', 'none'] }).notNull().default('none'),
  tags: text('tags').default('[]'), // JSON array
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
  sessionKey: text('session_key'), // OpenClaw session key tracking this task
  dispatchedAt: text('dispatched_at') // When it was last dispatched
});

// Content Pipeline
export const contentItems = sqliteTable('content_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  stage: text('stage', {
    enum: ['idea', 'script', 'thumbnail', 'filming', 'editing', 'published']
  }).notNull().default('idea'),
  script: text('script').default(''),
  thumbnailPath: text('thumbnail_path'),
  platforms: text('platforms').default('[]'), // JSON array
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  publishedAt: text('published_at')
});

// Team members (agents)
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  memberType: text('member_type', { enum: ['human', 'agent'] }).notNull().default('agent'),
  emoji: text('emoji').default('🤖'),
  role: text('role').notNull(),
  model: text('model').default('sonnet'),
  specialties: text('specialties').default('[]'), // JSON array
  description: text('description').default(''),
  status: text('status', { enum: ['active', 'idle', 'busy'] }).notNull().default('idle'),
  currentTaskId: text('current_task_id'),
  lastUsed: text('last_used'),
  usageCount: integer('usage_count').default(0),
  successCount: integer('success_count').default(0),
  createdAt: text('created_at').notNull()
});

// Activity log (live feed)
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  type: text('type', {
    enum: ['task_created', 'task_updated', 'task_completed', 'agent_started', 'agent_completed', 'cron_run', 'alert']
  }).notNull(),
  actor: text('actor').notNull(), // 'eduardo', 'hawkbot', agent name, 'system'
  message: text('message').notNull(),
  taskId: text('task_id'),
  metadata: text('metadata').default('{}'), // JSON
  createdAt: text('created_at').notNull()
});
