export interface DomainEvent {
  aggregateId:   string;
  aggregateType: string;
  eventType:     string;
  payload:       any;
  createdAt?:    Date;
}

export interface IEventStore {
  save(event: DomainEvent): Promise<void>;
  findByAggregateId(aggregateId: string): Promise<DomainEvent[]>;
}
