import { describe, expect, it } from 'vitest';
import {
  buildNotificationActivityMetadata,
  buildTaskNotificationMessage,
  buildTaskNotificationPrompt,
  shouldNotifyTaskEvent
} from '../server/utils/notifications';

describe('task notifications', () => {
  it('builds Telegram-safe review notifications without tables or secrets', () => {
    const message = buildTaskNotificationMessage({
      event: 'review',
      taskTitle: 'Draft Lisbon plan',
      taskId: 'task-123',
      assigneeName: 'HawkBot - Hermes',
      provider: 'hermes'
    });

    expect(message).toContain('🦅 **Task ready for review**');
    expect(message).toContain('**Task:** Draft Lisbon plan');
    expect(message).toContain('**Runtime:** hermes');
    expect(message).toContain('**Inspect:** http://localhost:4000/tasks');
    expect(message).not.toContain('|');
    expect(message).not.toContain('token');
  });

  it('builds failure notifications with error details', () => {
    const message = buildTaskNotificationMessage({
      event: 'failure',
      taskTitle: 'Run smoke test',
      taskId: 'task-456',
      assigneeName: 'HawkBot - OpenClaw',
      provider: 'openclaw',
      error: 'Exited with status 1'
    });

    expect(message).toContain('🚨 **Task dispatch failed**');
    expect(message).toContain('**Error:** Exited with status 1');
  });

  it('respects per-event notification settings', () => {
    expect(shouldNotifyTaskEvent('review', {
      telegram_notifications_enabled: 'true',
      notify_on_review: 'true'
    })).toBe(true);

    expect(shouldNotifyTaskEvent('review', {
      telegram_notifications_enabled: 'true',
      notify_on_review: 'false'
    })).toBe(false);

    expect(shouldNotifyTaskEvent('failure', {
      telegram_notifications_enabled: 'false',
      notify_on_failure: 'true'
    })).toBe(false);
  });

  it('wraps notification messages in a Hermes Telegram prompt', () => {
    const prompt = buildTaskNotificationPrompt('Hello **Eduardo**');

    expect(prompt).toContain('Send this exact message to Eduardo on Telegram');
    expect(prompt).toContain('Hello **Eduardo**');
    expect(prompt).toContain('Do not add extra commentary');
  });

  it('builds notification activity metadata without storing the message body', () => {
    const metadata = buildNotificationActivityMetadata({
      event: 'failure',
      taskId: 'task-456',
      provider: 'hermes',
      command: 'hermes',
      profile: 'default'
    });

    expect(metadata).toEqual({
      notification: 'telegram',
      event: 'failure',
      taskId: 'task-456',
      provider: 'hermes',
      command: 'hermes',
      profileConfigured: true
    });
    expect(JSON.stringify(metadata)).not.toContain('Task dispatch failed');
  });
});
