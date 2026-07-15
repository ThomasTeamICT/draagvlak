import type { FastifyReply, FastifyRequest } from 'fastify'
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import { metTenantContext, type Db } from '../db.js'

/**
 * Authenticatie (ADR-0003): OIDC-Bearer-tokens, gevalideerd tegen de JWKS van
 * de issuer; de issuer bepaalt de tenant (core.idp_config). Autorisatie komt
 * uit core.roltoewijzing — het token bewijst wíé je bent, de databank wat je mag.
 */
export interface AuthContext {
  tenantId: string
  persoonId: string
  rollen: string[]
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
  }
}

interface IssuerConfig {
  tenantId: string
  audience: string
  jwks: ReturnType<typeof createRemoteJWKSet>
  geladenOp: number
}

const CONFIG_TTL_MS = 10 * 60 * 1000

export function maakAuthHandler(db: Db) {
  const perIssuer = new Map<string, IssuerConfig>()

  async function configVoorIssuer(issuer: string): Promise<IssuerConfig | undefined> {
    const cached = perIssuer.get(issuer)
    if (cached !== undefined && Date.now() - cached.geladenOp < CONFIG_TTL_MS) return cached

    const rijen = (await db`
      select tenant_id, audience, jwks_uri
      from core.idp_config_voor_issuer(${issuer})`) as unknown as {
      tenant_id: string
      audience: string
      jwks_uri: string
    }[]
    const rij = rijen[0]
    if (rij === undefined) return undefined

    const config: IssuerConfig = {
      tenantId: rij.tenant_id,
      audience: rij.audience,
      jwks: createRemoteJWKSet(new URL(rij.jwks_uri)),
      geladenOp: Date.now(),
    }
    perIssuer.set(issuer, config)
    return config
  }

  return async function authHandler(verzoek: FastifyRequest, antwoord: FastifyReply) {
    const header = verzoek.headers.authorization
    if (header === undefined || !header.startsWith('Bearer ')) {
      return antwoord.code(401).send({ fout: 'geen toegangstoken' })
    }
    const token = header.slice('Bearer '.length)

    let issuer: string | undefined
    try {
      issuer = decodeJwt(token).iss
    } catch {
      return antwoord.code(401).send({ fout: 'ongeldig toegangstoken' })
    }
    if (issuer === undefined) {
      return antwoord.code(401).send({ fout: 'ongeldig toegangstoken' })
    }

    const config = await configVoorIssuer(issuer)
    if (config === undefined) {
      return antwoord.code(401).send({ fout: 'onbekende issuer' })
    }

    let sub: string | undefined
    try {
      const { payload } = await jwtVerify(token, config.jwks, {
        issuer,
        audience: config.audience,
      })
      sub = payload.sub
    } catch {
      return antwoord.code(401).send({ fout: 'ongeldig toegangstoken' })
    }
    if (sub === undefined) {
      return antwoord.code(401).send({ fout: 'ongeldig toegangstoken' })
    }

    const context = await metTenantContext(db, config.tenantId, async (trx) => {
      const personen = (await trx`
        select id from core.persoon where idp_subject = ${sub}`) as unknown as { id: string }[]
      const persoon = personen[0]
      if (persoon === undefined) return undefined
      const rollen = (await trx`
        select distinct rol from core.roltoewijzing
        where persoon_id = ${persoon.id}
          and geldig_vanaf <= current_date
          and (geldig_tot is null or geldig_tot >= current_date)`) as unknown as { rol: string }[]
      return { persoonId: persoon.id, rollen: rollen.map((r) => r.rol) }
    })

    // geldig token maar geen gekende persoon: geen JIT-provisioning (ADR-0003)
    if (context === undefined) {
      return antwoord.code(403).send({ fout: 'geen account in dit platform' })
    }

    verzoek.auth = {
      tenantId: config.tenantId,
      persoonId: context.persoonId,
      rollen: context.rollen,
    }
    return undefined
  }
}

export function heeftRol(auth: AuthContext, ...rollen: string[]): boolean {
  return rollen.some((rol) => auth.rollen.includes(rol))
}
