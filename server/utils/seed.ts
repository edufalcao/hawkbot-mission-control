import { useDb } from '../db';
import { teamMembers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir, userInfo } from 'node:os';

interface OpenClawAgent {
  name: string,
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

type RuntimeProvider = 'openclaw' | 'hermes' | 'manual';

interface SeedTeamMember {
  name: string,
  memberType: 'human' | 'agent',
  emoji: string,
  role: string,
  specialties: string[],
  description: string,
  runtimeProvider: RuntimeProvider,
  runtimeProfile: string | null,
  runtimeCommand: string | null,
  runtimeWorkdir: string | null,
  openclawAgentId: string | null,
  agentDir: string | null
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
  hawkbot: '🦅',
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
  hawkbot: 'assistant',
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

function openClawDisplayName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'hawkbot' || lower === 'assistant' || lower.includes('hawkbot')) {
    return 'HawkBot - OpenClaw';
  }
  return name;
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

function buildHermesHawkBot(): SeedTeamMember {
  return {
    name: 'HawkBot - Hermes',
    memberType: 'agent',
    emoji: '🦅',
    role: 'assistant',
    specialties: ['orchestration', 'planning', 'automation'],
    description: 'Hermes-powered HawkBot assistant using the default Hermes configuration',
    runtimeProvider: 'hermes',
    runtimeProfile: null,
    runtimeCommand: null,
    runtimeWorkdir: null,
    openclawAgentId: null,
    agentDir: null
  };
}

function buildOwner(): SeedTeamMember {
  const username = userInfo().username;
  return {
    name: username,
    memberType: 'human',
    emoji: '👤',
    role: 'owner',
    specialties: ['management', 'review'],
    description: 'Project owner',
    runtimeProvider: 'manual',
    runtimeProfile: null,
    runtimeCommand: null,
    runtimeWorkdir: null,
    openclawAgentId: null,
    agentDir: null
  };
}

function buildTeamFromConfig(config: OpenClawConfig) {
  const members: SeedTeamMember[] = [];

  // Add agents from openclaw.json agents.list
  const agents = config.agents?.list || [];
  for (const agent of agents) {
    const displayName = openClawDisplayName(agent.name);
    members.push({
      name: displayName,
      memberType: 'agent',
      emoji: inferEmoji(displayName),
      role: inferRole(displayName),
      specialties: agent.tools || [],
      description: 'Imported from openclaw.json',
      runtimeProvider: 'openclaw',
      runtimeProfile: null,
      runtimeCommand: null,
      runtimeWorkdir: null,
      openclawAgentId: agent.name,
      agentDir: agent.agentDir || null
    });
  }

  members.push(buildHermesHawkBot());
  members.push(buildOwner());

  return members;
}

function buildFallbackTeam() {
  return [
    buildOwner(),
    {
      name: 'HawkBot - OpenClaw',
      memberType: 'agent' as const,
      emoji: '🦅',
      role: 'assistant',
      specialties: ['general'],
      description: 'OpenClaw-powered HawkBot assistant',
      runtimeProvider: 'openclaw' as const,
      runtimeProfile: null,
      runtimeCommand: null,
      runtimeWorkdir: null,
      openclawAgentId: 'hawkbot',
      agentDir: null
    },
    buildHermesHawkBot()
  ];
}

async function reconcileHawkBotTeam(db: ReturnType<typeof useDb>) {
  const members = await db.select().from(teamMembers);
  const now = new Date().toISOString();

  const hasHermesHawkBot = members.some(member =>
    member.name === 'HawkBot - Hermes'
    || (member.runtimeProvider === 'hermes' && member.name.toLowerCase().includes('hawkbot'))
  );

  for (const member of members) {
    const lowerName = member.name.toLowerCase();
    const isLegacyHawkBot = lowerName === 'hawkbot'
      || lowerName === 'assistant'
      || (lowerName.includes('hawkbot') && member.runtimeProvider !== 'hermes' && member.name !== 'HawkBot - OpenClaw');

    if (isLegacyHawkBot) {
      await db.update(teamMembers).set({
        name: 'HawkBot - OpenClaw',
        emoji: '🦅',
        role: 'assistant',
        runtimeProvider: 'openclaw',
        openclawAgentId: member.openclawAgentId || 'hawkbot'
      }).where(eq(teamMembers.id, member.id));
    }
  }

  if (!hasHermesHawkBot) {
    const hermesHawkBot = buildHermesHawkBot();
    await db.insert(teamMembers).values({
      id: uuidv4(),
      ...hermesHawkBot,
      specialties: JSON.stringify(hermesHawkBot.specialties),
      status: 'idle',
      createdAt: now
    });
    console.log('[seed] Added HawkBot - Hermes to existing team');
  }
}

export async function seedDefaultTeam() {
  const db = useDb();

  // Only seed if the team table is completely empty
  const existing = await db.select().from(teamMembers).limit(1);
  if (existing.length > 0) {
    await reconcileHawkBotTeam(db);
    console.log('[seed] Team table already has members, reconciled HawkBot agents');
    return;
  }

  // Try to read from OpenClaw config
  const config = readOpenClawConfig();
  const team = config ? buildTeamFromConfig(config) : buildFallbackTeam();

  if (config) {
    const agentCount = config.agents?.list?.length || 0;
    console.log(`[seed] Importing ${agentCount} OpenClaw agent(s) and adding HawkBot - Hermes`);
  } else {
    console.log('[seed] Using fallback team (owner + HawkBot OpenClaw + HawkBot Hermes)');
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
