export interface RetryTaskLike {
  id: string,
  status: string,
  assignee: string
}

export interface RetryAssigneeLike {
  id: string,
  name?: string | null,
  memberType?: string | null,
  runtimeProvider?: string | null,
  status?: string | null,
  currentTaskId?: string | null
}

export type TaskRetryDecision = { retryable: true } | { retryable: false, reason: string };

export function getTaskRetryDecision(input: {
  task: RetryTaskLike,
  assignee: RetryAssigneeLike | null | undefined,
  isDispatching: boolean
}): TaskRetryDecision {
  if (input.isDispatching) return { retryable: false, reason: 'Task is already dispatching.' };

  if (!input.assignee || input.assignee.memberType !== 'agent') {
    return { retryable: false, reason: 'Only agent-assigned tasks can be retried.' };
  }

  if (input.assignee.runtimeProvider === 'manual') {
    return { retryable: false, reason: 'Manual-runtime tasks cannot be retried.' };
  }

  if (input.task.status === 'in_progress') {
    return { retryable: false, reason: 'Tasks in progress cannot be retried.' };
  }

  return { retryable: true };
}
