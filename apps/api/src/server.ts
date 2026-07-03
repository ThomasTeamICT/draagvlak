import { buildApp } from './app.js'

const app = buildApp({
  ...(process.env['DATABASE_URL'] !== undefined
    ? { databaseUrl: process.env['DATABASE_URL'] }
    : {}),
})
const poort = Number(process.env['PORT'] ?? 3000)

app.listen({ port: poort, host: '0.0.0.0' }).catch((fout) => {
  app.log.error(fout)
  process.exit(1)
})
