import Fastify, { type FastifyInstance } from 'fastify'
import { maakDb } from './db.js'
import { personeelModule } from './modules/personeel/routes.js'

export interface AppOpties {
  /** Zonder databaseUrl start de app met alleen health/version (bv. unit-tests). */
  databaseUrl?: string
}

/**
 * Bouwt de applicatie zonder te luisteren — herbruikbaar in tests (inject) en in server.ts.
 * Elke module (blauwdruk A-E) is een eigen plugin met eigen routes, schema's en rechten.
 */
export function buildApp(opties: AppOpties = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/version', async () => ({
    naam: 'draagvlak-api',
    versie: '0.1.0',
    fase: '1 — verticale doorsnede module B',
  }))

  if (opties.databaseUrl !== undefined) {
    const db = maakDb(opties.databaseUrl)
    app.register(personeelModule(db))
    app.addHook('onClose', async () => {
      await db.end()
    })
  }

  return app
}
