import { buildApp } from './app.js'

const app = buildApp()
const poort = Number(process.env['PORT'] ?? 3000)

app.listen({ port: poort, host: '0.0.0.0' }).catch((fout) => {
  app.log.error(fout)
  process.exit(1)
})
