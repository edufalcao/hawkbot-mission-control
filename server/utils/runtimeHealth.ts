import { spawnSync } from 'node:child_process';
import { getGatewayHealth } from './gateway';

export interface RuntimeHealthItem {
  provider: 'hermes' | 'openclaw',
  command: string,
  available: boolean,
  version: string | null,
  error: string | null,
  ready: boolean,
  details: Record<string, unknown>
}

export interface RuntimeHealthReport {
  generatedAt: string,
  runtimes: {
    hermes: RuntimeHealthItem,
    openclaw: RuntimeHealthItem
  }
}

function checkCommand(command: string, args: string[] = ['--version']) {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    timeout: 3000
  });

  if (result.error) {
    return {
      available: false,
      version: null,
      error: result.error.message
    };
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return {
    available: result.status === 0,
    version: output.split('\n')[0] || null,
    error: result.status === 0 ? null : output || `Exited with status ${result.status}`
  };
}

export function getRuntimeHealth(settings: Record<string, string | undefined> = {}): RuntimeHealthReport {
  const hermesCommand = settings.hermes_command || 'hermes';
  const openclawCommand = settings.openclaw_command || 'openclaw';
  const hermes = checkCommand(hermesCommand, ['--version']);
  const openclaw = checkCommand(openclawCommand, ['--version']);
  const gateway = getGatewayHealth();
  const openclawSessionId = settings.openclaw_main_session_id || settings.main_session_id || '';

  return {
    generatedAt: new Date().toISOString(),
    runtimes: {
      hermes: {
        provider: 'hermes',
        command: hermesCommand,
        available: hermes.available,
        version: hermes.version,
        error: hermes.error,
        ready: hermes.available,
        details: {
          defaultProfile: settings.hermes_default_profile || null,
          worktreeMode: settings.hermes_worktree_mode === 'true'
        }
      },
      openclaw: {
        provider: 'openclaw',
        command: openclawCommand,
        available: openclaw.available,
        version: openclaw.version,
        error: openclaw.error,
        ready: openclaw.available && Boolean(openclawSessionId),
        details: {
          sessionConfigured: Boolean(openclawSessionId),
          gatewayStatus: gateway.status,
          gatewayConnected: gateway.connected,
          gatewayLastError: gateway.lastError
        }
      }
    }
  };
}
