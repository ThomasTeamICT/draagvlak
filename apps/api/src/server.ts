import { buildApp } from './app.js'

const app = buildApp({
  ...(process.env['DATABASE_URL'] !== undefined
    ? { databaseUrl: process.env['DATABASE_URL'] }
    : {}),
  // nachtelijke deadline-herberekening (ADR-0004); uitschakelen kan met
  // HERBEREKEN_PLANNER=uit, tijdstip (Belgische tijd) via HERBEREKEN_TIJDSTIP
  ...(process.env['DATABASE_URL'] !== undefined && process.env['HERBEREKEN_PLANNER'] !== 'uit'
    ? {
        planner: {
          ...(process.env['HERBEREKEN_TIJDSTIP'] !== undefined
            ? { tijdstip: process.env['HERBEREKEN_TIJDSTIP'] }
            : {}),
        },
      }
    : {}),
})
const poort = Number(process.env['PORT'] ?? 3000)

app.listen({ port: poort, host: '0.0.0.0' }).catch((fout) => {
  app.log.error(fout)
  process.exit(1)
})
