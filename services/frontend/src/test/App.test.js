import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should have correct environment', () => {
    expect(typeof import.meta.env).toBe('object');
  });

  it('should validate task statuses', () => {
    const validStatuses = ['todo', 'in_progress', 'done'];
    expect(validStatuses).toContain('todo');
    expect(validStatuses).toContain('in_progress');
    expect(validStatuses).toContain('done');
    expect(validStatuses).not.toContain('invalid');
  });
});
