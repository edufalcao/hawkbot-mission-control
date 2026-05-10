import { describe, expect, it } from 'vitest';
import { getTaskRetryDecision } from '../server/utils/taskRetry';

const baseTask = {
  id: 'task-1',
  title: 'Retry me',
  status: 'todo',
  assignee: 'agent-1'
};

const baseAgent = {
  id: 'agent-1',
  name: 'HawkBot - Hermes',
  memberType: 'agent',
  runtimeProvider: 'hermes',
  status: 'idle'
};

describe('getTaskRetryDecision', () => {
  it('allows idle agent tasks in todo, review, or done states to be retried', () => {
    for (const status of ['todo', 'review', 'done']) {
      expect(getTaskRetryDecision({
        task: { ...baseTask, status },
        assignee: baseAgent,
        isDispatching: false
      })).toEqual({ retryable: true });
    }
  });

  it('blocks human-assigned tasks', () => {
    expect(getTaskRetryDecision({
      task: baseTask,
      assignee: { ...baseAgent, memberType: 'human', name: 'Eduardo' },
      isDispatching: false
    })).toEqual({ retryable: false, reason: 'Only agent-assigned tasks can be retried.' });
  });

  it('blocks tasks that are already dispatching or in progress', () => {
    expect(getTaskRetryDecision({
      task: baseTask,
      assignee: baseAgent,
      isDispatching: true
    })).toEqual({ retryable: false, reason: 'Task is already dispatching.' });

    expect(getTaskRetryDecision({
      task: { ...baseTask, status: 'in_progress' },
      assignee: baseAgent,
      isDispatching: false
    })).toEqual({ retryable: false, reason: 'Tasks in progress cannot be retried.' });
  });

  it('blocks manual-runtime agents because there is nothing to dispatch', () => {
    expect(getTaskRetryDecision({
      task: baseTask,
      assignee: { ...baseAgent, runtimeProvider: 'manual' },
      isDispatching: false
    })).toEqual({ retryable: false, reason: 'Manual-runtime tasks cannot be retried.' });
  });
});
