import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

/**
 * Routes live at the root because the ingress strips the `/api/users` prefix:
 * public `GET /api/users/<id>` arrives here as `GET /<id>`.
 * TODO: protect with the shared Keycloak JWT guard once packages/auth exists.
 */
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // ParseUUIDPipe returns 400 for ids that aren't UUIDs, before we hit the database.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }
}
