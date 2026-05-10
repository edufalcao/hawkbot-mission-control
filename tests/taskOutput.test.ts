import { describe, expect, it } from 'vitest';
import { summarizeTaskOutput } from '../server/utils/taskOutput';

describe('summarizeTaskOutput', () => {
  it('selects the newest runtime output log and exposes stdout/stderr details', () => {
    const logs = [
      {
        id: 'old',
        type: 'task_updated',
        actor: 'system',
        message: 'dispatched',
        createdAt: '2026-05-10T10:00:00.000Z',
        metadata: { provider: 'hermes' }
      },
      {
        id: 'new',
        type: 'agent_completed',
        actor: 'HawkBot - Hermes',
        message: 'completed',
        createdAt: '2026-05-10T10:01:00.000Z',
        metadata: {
          provider: 'hermes',
          command: 'hermes chat -q <prompt>',
          durationMs: 1234,
          stdoutTail: 'final answer',
          stderrTail: ''
        }
      }
    ];

    expect(summarizeTaskOutput(logs)).toEqual({
      latest: logs[1],
      provider: 'hermes',
      command: 'hermes chat -q <prompt>',
      durationMs: 1234,
      exitCode: null,
      error: null,
      stdoutTail: 'final answer',
      stderrTail: '',
      hasOutput: true
    });
  });

  it('returns an empty summary when no runtime output exists', () => {
    expect(summarizeTaskOutput([])).toEqual({
      latest: null,
      provider: null,
      command: null,
      durationMs: null,
      exitCode: null,
      error: null,
      stdoutTail: '',
      stderrTail: '',
      hasOutput: false
    });
  });
});
