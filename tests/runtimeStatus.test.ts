import { describe, expect, it } from 'vitest';
import { summarizeRuntimeHealth } from '../app/utils/runtimeStatus';

const baseRuntime = {
  command: 'runtime',
  available: true,
  version: '1.0.0',
  error: null,
  ready: true,
  details: {}
};

function report(overrides: Partial<Record<'hermes' | 'openclaw', Partial<typeof baseRuntime>>> = {}) {
  return {
    generatedAt: '2026-05-10T16:20:00.000Z',
    runtimes: {
      hermes: { ...baseRuntime, provider: 'hermes' as const, ...(overrides.hermes || {}) },
      openclaw: { ...baseRuntime, provider: 'openclaw' as const, ...(overrides.openclaw || {}) }
    }
  };
}

describe('summarizeRuntimeHealth', () => {
  it('reports ready when all runtimes are ready', () => {
    expect(summarizeRuntimeHealth(report())).toEqual({
      status: 'ready',
      label: 'Runtimes ready',
      detail: 'Hermes ready · OpenClaw ready',
      badges: [
        { provider: 'hermes', label: 'Hermes', status: 'ready', detail: 'Ready' },
        { provider: 'openclaw', label: 'OpenClaw', status: 'ready', detail: 'Ready' }
      ]
    });
  });

  it('reports warning when a runtime is available but needs config', () => {
    const summary = summarizeRuntimeHealth(report({ openclaw: { ready: false, available: true } }));

    expect(summary.status).toBe('warning');
    expect(summary.label).toBe('Runtime needs config');
    expect(summary.badges[1]).toEqual({
      provider: 'openclaw',
      label: 'OpenClaw',
      status: 'warning',
      detail: 'Needs config'
    });
  });

  it('reports error when a runtime is unavailable', () => {
    const summary = summarizeRuntimeHealth(report({ hermes: { ready: false, available: false, error: 'not found' } }));

    expect(summary.status).toBe('error');
    expect(summary.label).toBe('Runtime unavailable');
    expect(summary.badges[0]).toEqual({
      provider: 'hermes',
      label: 'Hermes',
      status: 'error',
      detail: 'Unavailable'
    });
  });

  it('treats a missing report as loading', () => {
    expect(summarizeRuntimeHealth(null)).toEqual({
      status: 'loading',
      label: 'Checking runtimes...',
      detail: 'Runtime health is loading',
      badges: []
    });
  });
});
