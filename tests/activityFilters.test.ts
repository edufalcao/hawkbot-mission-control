import { describe, expect, it } from 'vitest';
import { parseActivityFilters } from '../server/utils/activityFilters';

describe('parseActivityFilters', () => {
  it('keeps supported filters and defaults limit to 50', () => {
    expect(parseActivityFilters({
      type: 'task_updated',
      actor: 'HawkBot',
      taskId: 'task-123'
    })).toEqual({
      type: 'task_updated',
      actor: 'HawkBot',
      taskId: 'task-123',
      limit: 50
    });
  });

  it('clamps limit between 1 and 200', () => {
    expect(parseActivityFilters({ limit: '0' }).limit).toBe(1);
    expect(parseActivityFilters({ limit: '999' }).limit).toBe(200);
    expect(parseActivityFilters({ limit: '25' }).limit).toBe(25);
  });

  it('ignores blank or array values', () => {
    expect(parseActivityFilters({
      type: '',
      actor: ['one', 'two'],
      taskId: '   ',
      limit: 'not-a-number'
    })).toEqual({ limit: 50 });
  });
});
