import { randomUUID } from 'node:crypto';                                       // NEW
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';                    // NEW
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EXCHANGE, Events, type UserDeletedEvent } from 'contracts';            // NEW
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './user.entity.js';


@Injectable()
export class UsersService {
  // TypeORM gives us a Repository<User> with typed, parameterized queries (no raw SQL strings).
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findAll(): Promise<User[]> {
    return this.users.find({ order: { username: 'ASC' } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`); // → 404
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    if (await this.users.existsBy({ id: dto.id })) {
      throw new ConflictException(`User ${dto.id} already exists`); // → 409
    }
    return this.users.save(this.users.create(dto));
  }

  async remove(id: string): Promise<void> {
  const result = await this.users.delete({ id });
  if (!result.affected) {
    throw new NotFoundException(`User ${id} not found`);   // → 404, nothing published
  }

  const event: UserDeletedEvent = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    userId: id,
  };
  await this.amqp.publish(EXCHANGE, Events.UserDeleted, event, { persistent: true });
}
}
