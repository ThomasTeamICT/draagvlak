import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'

describe('api-skelet', () => {
  it('GET /health antwoordt ok', async () => {
    const app = buildApp()
    const antwoord = await app.inject({ method: 'GET', url: '/health' })
    expect(antwoord.statusCode).toBe(200)
    expect(antwoord.json()).toEqual({ status: 'ok' })
  })

  it('GET /version identificeert de applicatie', async () => {
    const app = buildApp()
    const antwoord = await app.inject({ method: 'GET', url: '/version' })
    expect(antwoord.statusCode).toBe(200)
    expect(antwoord.json()).toMatchObject({ naam: 'draagvlak-api' })
  })
})
