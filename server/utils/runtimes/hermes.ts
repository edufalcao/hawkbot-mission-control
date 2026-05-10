import type { AgentRuntimeAdapter } from './types';

export const hermesRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'hermes',
  buildSpawnPlan({ agent, prompt, settings }) {
    const args = ['chat'];
    const profile = agent.runtimeProfile || settings.hermes_default_profile;

    if (profile) args.push('--profile', profile);
    if (settings.hermes_worktree_mode === 'true') args.push('--worktree');

    args.push('-q', prompt);

    const displayArgs = args.map(arg => arg === prompt ? '[prompt]' : arg);

    return {
      provider: 'hermes',
      command: agent.runtimeCommand || 'hermes',
      args,
      cwd: agent.runtimeWorkdir || agent.agentDir || undefined,
      displayCommand: `hermes ${displayArgs.join(' ')}`
    };
  }
};
