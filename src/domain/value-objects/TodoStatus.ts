/**
 * Value Object (enumeration): the current lifecycle state of a Todo.
 *
 * Transitions are enforced by the Todo Aggregate, not here.
 */
export enum TodoStatus {
  active = 'active',
  completed = 'completed',
}
