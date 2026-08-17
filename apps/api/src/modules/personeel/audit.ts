import type { Trx } from '../../db.js'

/** Append-only audittrail-regel (DPIA V8: wie-wijzigde-wat-wanneer, met reden). */
export async function schrijfAudit(
  trx: Trx,
  tenantId: string,
  actorId: string | null,
  objectType: string,
  objectId: string,
  reden: string,
): Promise<void> {
  await trx`
    insert into core.audit_log (tenant_id, actor_id, actie, object_type, object_id, context)
    values (${tenantId}, ${actorId}, 'schrijf', ${objectType}, ${objectId}, ${trx.json({ reden, bron: 'deadline-engine' })})`
}
