export interface ActivityFilters {
  type?: string,
  actor?: string,
  taskId?: string,
  limit: number
}

type QueryValue = string | string[] | undefined;

function asNonBlankString(value: QueryValue) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseLimit(value: QueryValue) {
  const parsed = Number(asNonBlankString(value) || '50');
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(200, Math.max(1, Math.floor(parsed)));
}

export function parseActivityFilters(query: Record<string, QueryValue>): ActivityFilters {
  const filters: ActivityFilters = {
    limit: parseLimit(query.limit)
  };

  const type = asNonBlankString(query.type);
  const actor = asNonBlankString(query.actor);
  const taskId = asNonBlankString(query.taskId);

  if (type) filters.type = type;
  if (actor) filters.actor = actor;
  if (taskId) filters.taskId = taskId;

  return filters;
}
