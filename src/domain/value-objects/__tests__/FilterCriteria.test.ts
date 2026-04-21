import { FilterCriteria } from '../FilterCriteria';

describe('FilterCriteria', () => {
  it('All has value "all"', () => {
    expect(FilterCriteria.All).toBe('all');
  });

  it('Active has value "active"', () => {
    expect(FilterCriteria.Active).toBe('active');
  });

  it('Completed has value "completed"', () => {
    expect(FilterCriteria.Completed).toBe('completed');
  });

  it('All, Active, and Completed are all distinct', () => {
    const values = new Set([
      FilterCriteria.All,
      FilterCriteria.Active,
      FilterCriteria.Completed,
    ]);
    expect(values.size).toBe(3);
  });

  it('contains exactly three members', () => {
    const values = Object.values(FilterCriteria);
    expect(values).toHaveLength(3);
  });
});
