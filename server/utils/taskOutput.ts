export interface TaskOutputLog {
  id: string,
  type: string,
  actor: string,
  message: string,
  createdAt: string,
  metadata: Record<string, unknown>
}

export interface TaskOutputSummary {
  latest: TaskOutputLog | null,
  provider: string | null,
  command: string | null,
  durationMs: number | null,
  exitCode: number | null,
  error: string | null,
  stdoutTail: string,
  stderrTail: string,
  hasOutput: boolean
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRuntimeOutputLog(log: TaskOutputLog) {
  const metadata = log.metadata || {};
  return Boolean(
    metadata.stdoutTail
    || metadata.stderrTail
    || metadata.durationMs
    || metadata.exitCode
    || metadata.error
    || log.type === 'agent_completed'
  );
}

export function summarizeTaskOutput(logs: TaskOutputLog[]): TaskOutputSummary {
  const latest = [...logs]
    .filter(isRuntimeOutputLog)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] || null;

  if (!latest) {
    return {
      latest: null,
      provider: null,
      command: null,
      durationMs: null,
      exitCode: null,
      error: null,
      stdoutTail: '',
      stderrTail: '',
      hasOutput: false
    };
  }

  const metadata = latest.metadata || {};
  const stdoutTail = stringValue(metadata.stdoutTail) || '';
  const stderrTail = stringValue(metadata.stderrTail) || '';

  return {
    latest,
    provider: stringValue(metadata.provider),
    command: stringValue(metadata.command),
    durationMs: numberValue(metadata.durationMs),
    exitCode: numberValue(metadata.exitCode),
    error: stringValue(metadata.error),
    stdoutTail,
    stderrTail,
    hasOutput: Boolean(stdoutTail || stderrTail)
  };
}
