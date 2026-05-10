export type RuntimeProvider = 'hermes' | 'openclaw';
export type RuntimeBadgeStatus = 'ready' | 'warning' | 'error';
export type RuntimeOverallStatus = RuntimeBadgeStatus | 'loading';

export interface RuntimeHealthItem {
  provider: RuntimeProvider,
  command: string,
  available: boolean,
  version: string | null,
  error: string | null,
  ready: boolean,
  details: Record<string, unknown>
}

export interface RuntimeHealthReport {
  generatedAt: string,
  runtimes: Record<RuntimeProvider, RuntimeHealthItem>
}

export interface RuntimeHealthBadge {
  provider: RuntimeProvider,
  label: string,
  status: RuntimeBadgeStatus,
  detail: string
}

export interface RuntimeHealthSummary {
  status: RuntimeOverallStatus,
  label: string,
  detail: string,
  badges: RuntimeHealthBadge[]
}

const RUNTIME_LABELS: Record<RuntimeProvider, string> = {
  hermes: 'Hermes',
  openclaw: 'OpenClaw'
};

function badgeStatus(runtime: RuntimeHealthItem): RuntimeBadgeStatus {
  if (!runtime.available) return 'error';
  if (!runtime.ready) return 'warning';
  return 'ready';
}

function badgeDetail(status: RuntimeBadgeStatus) {
  if (status === 'ready') return 'Ready';
  if (status === 'warning') return 'Needs config';
  return 'Unavailable';
}

export function summarizeRuntimeHealth(report: RuntimeHealthReport | null | undefined): RuntimeHealthSummary {
  if (!report) {
    return {
      status: 'loading',
      label: 'Checking runtimes...',
      detail: 'Runtime health is loading',
      badges: []
    };
  }

  const badges = (['hermes', 'openclaw'] as const).map((provider) => {
    const status = badgeStatus(report.runtimes[provider]);
    return {
      provider,
      label: RUNTIME_LABELS[provider],
      status,
      detail: badgeDetail(status)
    };
  });

  const status: RuntimeOverallStatus = badges.some(badge => badge.status === 'error')
    ? 'error'
    : badges.some(badge => badge.status === 'warning')
      ? 'warning'
      : 'ready';

  const label = status === 'error'
    ? 'Runtime unavailable'
    : status === 'warning'
      ? 'Runtime needs config'
      : 'Runtimes ready';

  return {
    status,
    label,
    detail: badges.map(badge => `${badge.label} ${badge.detail.toLowerCase()}`).join(' · '),
    badges
  };
}
