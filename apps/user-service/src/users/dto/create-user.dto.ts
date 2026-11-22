import { IsString, IsUUID, Length } from 'class-validator';

/** Body of POST /. Validated by the global ValidationPipe (see main.ts). */
export class CreateUserDto {
  // Until Keycloak is added the client sends the id; later it comes from the JWT `sub`.
  @IsUUID()
  id: string;

  @IsString()
  @Length(1, 64)
  username: string;
}
