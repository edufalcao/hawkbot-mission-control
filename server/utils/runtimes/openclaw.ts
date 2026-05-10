import type { AgentRuntimeAdapter } from './types';

function getOpenClawSessionId(settings: Record<string, string | undefined>) {
  return settings.openclaw_main_session_id || settings.main_session_id || null;
}

export const openClawRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'openclaw',
  buildSpawnPlan({ agent, prompt, settings }) {
    const sessionId = getOpenClawSessionId(settings);
    if (!sessionId) {
      throw new Error('OpenClaw session ID is not configured. Set openclaw_main_session_id or legacy main_session_id.');
    }

    return {
      provider: 'openclaw',
      command: agent.runtimeCommand || 'openclaw',
      args: ['agent', '--session-id', sessionId, '--message', prompt],
      cwd: agent.runtimeWorkdir || agent.agentDir || undefined,
      displayCommand: 'openclaw agent --session-id [redacted] --message [prompt]'
    };
  }
};
