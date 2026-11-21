import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller.js';
import { CreateUsers1763740800000 } from './migrations/1763740800000-CreateUsers.js';
import { User } from './users/user.entity.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    // Loads .env (local dev) and process.env (Kubernetes) into ConfigService.
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'), // fail fast if missing
        entities: [User],
        migrations: [CreateUsers1763740800000],
        migrationsRun: true, // apply pending migrations on startup
        synchronize: false, // never let TypeORM change the schema on its own
      }),
    }),
    UsersModule,
  ],
  // The root module's routes are registered before imported modules' routes, so
  // GET /health is matched before UsersController's GET /:id.
  controllers: [HealthController],
})
export class AppModule {}
