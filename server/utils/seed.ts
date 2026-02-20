import { useDb } from '../db'
import { teamMembers } from '../db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_TEAM = [
  {
    name: 'Eduardo',
    memberType: 'human' as const,
    emoji: '👤',
    role: 'owner',
    model: null,
    specialties: ['management', 'review', 'planning'],
    description: 'Project owner — manual task management'
  },
  {
    name: 'HawkBot',
    memberType: 'agent' as const,
    emoji: '🦅',
    role: 'assistant',
    model: 'sonnet',
    specialties: ['orchestration', 'planning', 'memory'],
    description: 'Main assistant — orchestrates agents and manages daily tasks'
  },
  {
    name: 'Dev Agent',
    memberType: 'agent' as const,
    emoji: '💻',
    role: 'developer',
    model: 'sonnet',
    specialties: ['javascript', 'nuxt', 'typescript', 'node'],
    description: 'Code, debugging, refactoring, architecture'
  },
  {
    name: 'Research Agent',
    memberType: 'agent' as const,
    emoji: '🔍',
    role: 'researcher',
    model: 'sonnet',
    specialties: ['web-search', 'analysis', 'summarization'],
    description: 'Web research, technical analysis, data gathering'
  },
  {
    name: 'Ops Agent',
    memberType: 'agent' as const,
    emoji: '⚙️',
    role: 'operator',
    model: 'sonnet',
    specialties: ['cron', 'monitoring', 'infra', 'automation'],
    description: 'Cron jobs, monitoring, infrastructure, automation'
  },
  {
    name: 'Writer Agent',
    memberType: 'agent' as const,
    emoji: '✍️',
    role: 'writer',
    model: 'sonnet',
    specialties: ['docs', 'reports', 'posts', 'scripts'],
    description: 'Documentation, reports, technical posts, content scripts'
  }
]

export async function seedDefaultTeam() {
  const db = useDb()
  const now = new Date().toISOString()

  for (const member of DEFAULT_TEAM) {
    const existing = await db.select().from(teamMembers)
      .where(eq(teamMembers.name, member.name))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(teamMembers).values({
        id: uuidv4(),
        ...member,
        specialties: JSON.stringify(member.specialties),
        status: 'idle',
        createdAt: now
      })
    }
  }
}
