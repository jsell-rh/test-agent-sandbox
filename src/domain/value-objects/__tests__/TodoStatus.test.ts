import { TodoStatus } from '../TodoStatus';

describe('TodoStatus', () => {
  it('Active has value "active"', () => {
    expect(TodoStatus.Active).toBe('active');
  });

  it('Completed has value "completed"', () => {
    expect(TodoStatus.Completed).toBe('completed');
  });

  it('Active and Completed are distinct', () => {
    expect(TodoStatus.Active).not.toBe(TodoStatus.Completed);
  });

  it('contains exactly two members', () => {
    const values = Object.values(TodoStatus);
    expect(values).toHaveLength(2);
  });
});
