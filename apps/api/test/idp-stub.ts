/**
 * Minimale IdP-stub voor integratietests: een lokale JWKS-endpoint plus een
 * tokenfabriek, zodat de volledige verificatieketen (handtekening, issuer,
 * audience, vervaltijd) bij elke testrun echt doorlopen wordt (ADR-0003).
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose'

export interface TokenOpties {
  issuer: string
  audience: string
  sub: string
  /** Standaard 10 minuten geldig; negatief voor een verlopen token. */
  geldigSeconden?: number
  /** Teken met een vreemde sleutel (handtekening-test). */
  sleutel?: KeyLike
}

export interface IdpStub {
  jwksUri: string
  vreemdeSleutel: KeyLike
  token: (opties: TokenOpties) => Promise<string>
  stop: () => Promise<void>
}

export async function startIdpStub(): Promise<IdpStub> {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const vreemd = await generateKeyPair('RS256')

  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-sleutel', alg: 'RS256', use: 'sig' }
  const server: Server = createServer((_verzoek, antwoord) => {
    antwoord.setHeader('content-type', 'application/json')
    antwoord.end(JSON.stringify({ keys: [jwk] }))
  })
  await new Promise<void>((klaar) => server.listen(0, '127.0.0.1', klaar))
  const poort = (server.address() as AddressInfo).port

  return {
    jwksUri: `http://127.0.0.1:${poort}/jwks`,
    vreemdeSleutel: vreemd.privateKey,
    async token(opties) {
      const geldig = opties.geldigSeconden ?? 600
      const nu = Math.floor(Date.now() / 1000)
      return new SignJWT({})
        .setProtectedHeader({ alg: 'RS256', kid: 'test-sleutel' })
        .setIssuer(opties.issuer)
        .setAudience(opties.audience)
        .setSubject(opties.sub)
        .setIssuedAt(nu)
        .setExpirationTime(nu + geldig)
        .sign(opties.sleutel ?? privateKey)
    },
    stop: () => new Promise<void>((klaar) => server.close(() => klaar())),
  }
}
