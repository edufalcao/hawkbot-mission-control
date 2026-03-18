import { useDb } from '../db';
import { teamMembers } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir, userInfo } from 'node:os';

interface OpenClawAgent {
  name: string,
  model?: string,
  agentDir?: string,
  tools?: string[]
}

interface OpenClawConfig {
  agents?: {
    list?: OpenClawAgent[]
  },
  identity?: {
    name?: string
  }
}

const EMOJI_MAP: Record<string, string> = {
  dev: '💻',
  developer: '💻',
  research: '🔍',
  researcher: '🔍',
  ops: '⚙️',
  operator: '⚙️',
  devops: '⚙️',
  writer: '✍️',
  content: '✍️',
  assistant: '🦅',
  default: '🤖'
};

const ROLE_MAP: Record<string, string> = {
  dev: 'developer',
  developer: 'developer',
  research: 'researcher',
  researcher: 'researcher',
  ops: 'operator',
  operator: 'operator',
  devops: 'operator',
  writer: 'writer',
  content: 'writer',
  assistant: 'assistant',
  default: 'agent'
};

function inferEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (key !== 'default' && lower.includes(key)) return emoji;
  }
  return EMOJI_MAP.default!;
}

function inferRole(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, role] of Object.entries(ROLE_MAP)) {
    if (key !== 'default' && lower.includes(key)) return role;
  }
  return ROLE_MAP.default!;
}

function readOpenClawConfig(): OpenClawConfig | null {
  const configPath = resolve(homedir(), '.openclaw', 'openclaw.json');
  if (!existsSync(configPath)) {
    console.log(`[seed] OpenClaw config not found at ${configPath}`);
    return null;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as OpenClawConfig;
  } catch (err) {
    console.warn('[seed] Failed to parse openclaw.json:', err);
    return null;
  }
}

function buildTeamFromConfig(config: OpenClawConfig) {
  const members: Array<{
    name: string,
    memberType: 'human' | 'agent',
    emoji: string,
    role: string,
    model: string | null,
    specialties: string[],
    description: string,
    openclawAgentId: string | null,
    agentDir: string | null
  }> = [];

  // Add agents from openclaw.json agents.list
  const agents = config.agents?.list || [];
  for (const agent of agents) {
    members.push({
      name: agent.name,
      memberType: 'agent',
      emoji: inferEmoji(agent.name),
      role: inferRole(agent.name),
      model: agent.model || null,
      specialties: agent.tools || [],
      description: `Imported from openclaw.json`,
      openclawAgentId: agent.name,
      agentDir: agent.agentDir || null
    });
  }

  // Add the current OS user as a human member
  const username = userInfo().username;
  members.push({
    name: username,
    memberType: 'human',
    emoji: '👤',
    role: 'owner',
    model: null,
    specialties: ['management', 'review'],
    description: 'Project owner',
    openclawAgentId: null,
    agentDir: null
  });

  return members;
}

function buildFallbackTeam() {
  const username = userInfo().username;
  return [
    {
      name: username,
      memberType: 'human' as const,
      emoji: '👤',
      role: 'owner',
      model: null,
      specialties: ['management', 'review'],
      description: 'Project owner',
      openclawAgentId: null,
      agentDir: null
    },
    {
      name: 'assistant',
      memberType: 'agent' as const,
      emoji: '🤖',
      role: 'assistant',
      model: 'sonnet',
      specialties: ['general'],
      description: 'Default assistant agent',
      openclawAgentId: null,
      agentDir: null
    }
  ];
}

export async function seedDefaultTeam() {
  const db = useDb();

  // Only seed if the team table is completely empty
  const existing = await db.select().from(teamMembers).limit(1);
  if (existing.length > 0) {
    console.log('[seed] Team table already has members, skipping seed');
    return;
  }

  // Try to read from OpenClaw config
  const config = readOpenClawConfig();
  const team = config ? buildTeamFromConfig(config) : buildFallbackTeam();

  if (config) {
    const agentCount = config.agents?.list?.length || 0;
    console.log(`[seed] Importing ${agentCount} agent(s) from openclaw.json`);
  } else {
    console.log('[seed] Using fallback team (1 human owner + 1 assistant agent)');
  }

  const now = new Date().toISOString();
  for (const member of team) {
    await db.insert(teamMembers).values({
      id: uuidv4(),
      ...member,
      specialties: JSON.stringify(member.specialties),
      status: 'idle',
      createdAt: now
    });
  }

  console.log(`[seed] Seeded ${team.length} team member(s)`);
}
