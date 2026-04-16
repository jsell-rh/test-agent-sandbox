/**
 * Base type for all Domain Events.
 *
 * Domain Events are immutable records emitted by Aggregates after a
 * state change is applied. They capture what happened in the domain.
 */
export interface DomainEvent {
  /** The name of the event, matching the Ubiquitous Language. */
  readonly eventName: string;
  /** The ISO 8601 UTC timestamp when this event occurred. */
  readonly occurredAt: string;
}
