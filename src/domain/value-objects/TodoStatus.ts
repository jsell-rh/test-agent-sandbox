/**
 * The current lifecycle state of a Todo.
 * Transitions are enforced by the Todo Aggregate.
 *
 * Spec-Ref: specs/domain-model.spec.md — Value Objects / TodoStatus
 */
export enum TodoStatus {
  Active = 'active',
  Completed = 'completed',
}
