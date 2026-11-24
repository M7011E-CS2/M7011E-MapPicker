import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { DEAD_LETTER_EXCHANGE, EXCHANGE, Events, type UserDeletedEvent } from 'contracts';

@Injectable()
export class UserDeletedListener {
  private readonly logger = new Logger(UserDeletedListener.name);   // missing in your version

  @RabbitSubscribe({
    exchange: EXCHANGE,
    routingKey: Events.UserDeleted,
    queue: 'user-service.user-deleted-audit',
    queueOptions: { durable: true, deadLetterExchange: DEAD_LETTER_EXCHANGE },
  })
  handle(event: UserDeletedEvent): void {
    this.logger.log(`user.deleted received: user ${event.userId} (event ${event.eventId})`);
  }
}