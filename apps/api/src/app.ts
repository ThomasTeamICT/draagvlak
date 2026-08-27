import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { maakDb } from './db.js'
import { maakAuthHandler } from './auth/plugin.js'
import { personeelModule } from './modules/personeel/routes.js'
import { planningModule } from './modules/planning/routes.js'
import { vervangingenModule } from './modules/planning/vervangingen-routes.js'
import { startPlanner, type PlannerOpties } from './scheduler.js'

export interface AppOpties {
  /** Zonder databaseUrl start de app met alleen health/version (bv. unit-tests). */
  databaseUrl?: string
  /** Plausibiliteitsvenster voor de injecteerbare `vandaag` van de deadline-engine. */
  herberekenVensterDagen?: number
  /** Nachtelijke deadline-herberekening (ADR-0004); niet gezet = geen planner (tests). */
  planner?: PlannerOpties
}

/**
 * Bouwt de applicatie zonder te luisteren — herbruikbaar in tests (inject) en in server.ts.
 * Elke module (blauwdruk A-E) is een eigen plugin met eigen routes, schema's en rechten.
 */
export function buildApp(opties: AppOpties = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env['NODE_ENV'] !== 'test',
  })

  // validatiefouten (4xx) gaan door; interne fouten worden gelogd maar
  // lekken geen details naar de client
  app.setErrorHandler((fout: FastifyError, verzoek, antwoord) => {
    const status = fout.statusCode ?? 500
    if (status < 500) {
      return antwoord.code(status).send({ fout: fout.message })
    }
    verzoek.log.error(fout)
    return antwoord.code(500).send({ fout: 'interne fout' })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/version', async () => ({
    naam: 'draagvlak-api',
    versie: '0.1.0',
    fase: '1 — verticale doorsnede module B',
  }))

  if (opties.databaseUrl !== undefined) {
    const db = maakDb(opties.databaseUrl)
    const authHandler = maakAuthHandler(db)
    app.register(
      personeelModule(db, {
        authHandler,
        ...(opties.herberekenVensterDagen !== undefined
          ? { vensterDagen: opties.herberekenVensterDagen }
          : {}),
      }),
    )
    app.register(planningModule(db, { authHandler }))
    app.register(vervangingenModule(db, { authHandler }))
    const stopPlanner = opties.planner !== undefined ? startPlanner(db, app.log, opties.planner) : undefined
    app.addHook('onClose', async () => {
      stopPlanner?.()
      await db.end()
    })
  }

  return app
}
