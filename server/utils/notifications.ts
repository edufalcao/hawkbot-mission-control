import { spawn } from 'node:child_process';

export type TaskNotificationEvent = 'review' | 'failure' | 'done';
export type NotificationSettings = Record<string, string | undefined>;

export interface TaskNotificationInput {
  event: TaskNotificationEvent,
  taskTitle: string,
  taskId: string,
  assigneeName?: string | null,
  provider?: string | null,
  error?: string | null
}

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value == null || value === '') return fallback;
  return value === 'true';
}

function sanitizeLine(value: string | null | undefined) {
  return String(value || '').replace(/[\r\n|]/g, ' ').trim();
}

export function shouldNotifyTaskEvent(event: TaskNotificationEvent, settings: NotificationSettings) {
  if (!isEnabled(settings.telegram_notifications_enabled, false)) return false;

  if (event === 'review') return isEnabled(settings.notify_on_review, true);
  if (event === 'failure') return isEnabled(settings.notify_on_failure, true);
  if (event === 'done') return isEnabled(settings.notify_on_done, false);
  return false;
}

export function buildTaskNotificationMessage(input: TaskNotificationInput) {
  const title = sanitizeLine(input.taskTitle);
  const assignee = sanitizeLine(input.assigneeName) || 'Unassigned';
  const provider = sanitizeLine(input.provider) || 'unknown';
  const inspectUrl = 'http://localhost:4000/tasks';

  const heading = input.event === 'failure'
    ? '🚨 **Task dispatch failed**'
    : input.event === 'done'
      ? '✅ **Task completed**'
      : '🦅 **Task ready for review**';

  const lines = [
    heading,
    `**Task:** ${title}`,
    `**Assignee:** ${assignee}`,
    `**Runtime:** ${provider}`
  ];

  if (input.event === 'failure') {
    lines.push(`**Error:** ${sanitizeLine(input.error) || 'Unknown error'}`);
  }

  lines.push(`**Inspect:** ${inspectUrl}`);

  return lines.join('\n');
}

export function buildTaskNotificationPrompt(message: string) {
  return `Send this exact message to Eduardo on Telegram:\n\n${message}\n\nDo not add extra commentary.`;
}

export function sendTaskNotification(input: TaskNotificationInput, settings: NotificationSettings) {
  if (!shouldNotifyTaskEvent(input.event, settings)) return false;

  const message = buildTaskNotificationMessage(input);
  const command = settings.notification_command || 'hermes';
  const profile = settings.notification_hermes_profile || settings.hermes_default_profile || '';
  const args = ['chat'];
  if (profile) args.push('--profile', profile);
  args.push('-q', buildTaskNotificationPrompt(message));

  const child = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    env: process.env
  });
  child.on('error', (err) => {
    console.error(`[notifications] Failed to send Telegram notification: ${err.message}`);
  });
  child.unref();

  return true;
}
