import { TodoTitle } from '../value-objects/TodoTitle';
import { InvalidTitleError } from '../errors/InvalidTitleError';

describe('TodoTitle', () => {
  describe('validation', () => {
    it('raises InvalidTitleError for a blank string', () => {
      expect(() => new TodoTitle('')).toThrow(InvalidTitleError);
    });

    it('raises InvalidTitleError for a whitespace-only string', () => {
      expect(() => new TodoTitle('   ')).toThrow(InvalidTitleError);
      expect(() => new TodoTitle('\t\n')).toThrow(InvalidTitleError);
    });

    it('accepts a 500-character string', () => {
      const title = 'a'.repeat(500);
      expect(() => new TodoTitle(title)).not.toThrow();
      expect(new TodoTitle(title).value).toBe(title);
    });

    it('raises InvalidTitleError for a 501-character string', () => {
      const title = 'a'.repeat(501);
      expect(() => new TodoTitle(title)).toThrow(InvalidTitleError);
    });

    it('trims leading and trailing whitespace before validation', () => {
      const todo = new TodoTitle('  Buy milk  ');
      expect(todo.value).toBe('Buy milk');
    });

    it('raises InvalidTitleError when trimmed value exceeds 500 characters', () => {
      const title = ' ' + 'a'.repeat(501) + ' ';
      expect(() => new TodoTitle(title)).toThrow(InvalidTitleError);
    });
  });

  describe('equality', () => {
    it('is equal to another TodoTitle with the same value', () => {
      const a = new TodoTitle('Buy milk');
      const b = new TodoTitle('Buy milk');
      expect(a.equals(b)).toBe(true);
    });

    it('is not equal to a TodoTitle with a different value', () => {
      const a = new TodoTitle('Buy milk');
      const b = new TodoTitle('Buy eggs');
      expect(a.equals(b)).toBe(false);
    });

    it('equality is case-sensitive', () => {
      const a = new TodoTitle('Buy Milk');
      const b = new TodoTitle('buy milk');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('exposes its value as a string', () => {
      const title = new TodoTitle('Build something great');
      expect(typeof title.value).toBe('string');
      expect(title.value).toBe('Build something great');
    });
  });
});
