import Fastify, { type FastifyInstance } from 'fastify'

/**
 * Bouwt de applicatie zonder te luisteren — herbruikbaar in tests (inject) en in server.ts.
 * De modulestructuur (plugins per module A-E) groeit hier naarmate Fase 1 vordert;
 * elke module wordt een eigen plugin met eigen routes, schema's en rechten.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/version', async () => ({
    naam: 'draagvlak-api',
    versie: '0.1.0',
    fase: '0 — scaffolding',
  }))

  return app
}
