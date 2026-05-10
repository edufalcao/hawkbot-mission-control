import type { AgentRuntimeAdapter, RuntimeProvider } from './types';
import { hermesRuntimeAdapter } from './hermes';
import { manualRuntimeAdapter } from './manual';
import { openClawRuntimeAdapter } from './openclaw';

const adapters = new Map<RuntimeProvider, AgentRuntimeAdapter>([
  ['manual', manualRuntimeAdapter],
  ['openclaw', openClawRuntimeAdapter],
  ['hermes', hermesRuntimeAdapter]
]);

export function registerRuntimeAdapter(adapter: AgentRuntimeAdapter) {
  adapters.set(adapter.provider, adapter);
}

export function getRuntimeAdapter(provider: RuntimeProvider): AgentRuntimeAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No runtime adapter registered for provider: ${provider}`);
  }
  return adapter;
}
