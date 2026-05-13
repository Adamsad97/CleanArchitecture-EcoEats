import { PrismaClient } from "../../generated/prisma/index.js";
import { IEventStore, DomainEvent } from "../../application/ports/IEventStore.js";

export class PrismaEventStore implements IEventStore {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: DomainEvent): Promise<void> {
    await this.prisma.domainEvent.create({
      data: {
        aggregate_id:   event.aggregateId,
        aggregate_type: event.aggregateType,
        event_type:     event.eventType,
        payload:        event.payload,
      },
    });
  }

  async findByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: { aggregate_id: aggregateId },
      orderBy: { created_at: "asc" },
    });

    return events.map(e => ({
      aggregateId:   e.aggregate_id,
      aggregateType: e.aggregate_type,
      eventType:     e.event_type,
      payload:        e.payload,
      createdAt:      e.created_at,
    }));
  }
}
