import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

/**
 * Liveness/readiness endpoint used by Kubernetes probes.
 * Public by design (AGENTS.md: only /health and /metrics are unauthenticated).
 * When the service gets a database, extend this to check the connection.
 */
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): { status: string } {
    return { status: 'ok' };
  }
}
