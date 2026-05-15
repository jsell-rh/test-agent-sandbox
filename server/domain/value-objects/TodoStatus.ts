/**
 * Value Object (enumeration): the current lifecycle state of a Todo.
 *
 * Transitions are enforced by the Todo Aggregate — this type has no
 * additional behaviour of its own.
 */
export enum TodoStatus {
  active = 'active',
  completed = 'completed',
}
