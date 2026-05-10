import type { AgentRuntimeAdapter } from './types';

export const manualRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'manual',
  buildSpawnPlan: () => null
};
