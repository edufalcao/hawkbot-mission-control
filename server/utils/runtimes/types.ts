export type RuntimeProvider = 'openclaw' | 'hermes' | 'manual';

export interface RuntimeAgent {
  id: string,
  name: string,
  emoji?: string | null,
  specialties?: string | null,
  runtimeProvider?: RuntimeProvider | null,
  runtimeProfile?: string | null,
  runtimeCommand?: string | null,
  runtimeWorkdir?: string | null,
  openclawAgentId?: string | null,
  agentDir?: string | null
}

export interface RuntimeTask {
  id: string,
  title: string,
  description: string | null,
  assignee: string,
  status: string
}

export interface RuntimeSettings {
  [key: string]: string | undefined
}

export interface SpawnPlan {
  provider: RuntimeProvider,
  command: string,
  args: string[],
  cwd?: string,
  env?: Record<string, string>,
  displayCommand: string
}

export interface AgentRuntimeAdapter {
  provider: RuntimeProvider,
  buildSpawnPlan(input: {
    task: RuntimeTask,
    agent: RuntimeAgent,
    prompt: string,
    settings: RuntimeSettings
  }): SpawnPlan | null
}
