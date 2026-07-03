import postgres from 'postgres'

export type Db = postgres.Sql
export type Trx = postgres.TransactionSql

export function maakDb(url: string): Db {
  return postgres(url, {
    max: 10,
    onnotice: () => {},
  })
}

/**
 * Het enige toegangspad tot tenant-data (ADR-0002): één transactie waarin de
 * tenant-context met SET LOCAL gezet is. RLS in de databank doet de afscherming;
 * buiten deze helper ziet de applicatierol nul rijen.
 */
export async function metTenantContext<T>(
  db: Db,
  tenantId: string,
  fn: (trx: Trx) => Promise<T>,
): Promise<T> {
  return (await db.begin(async (trx) => {
    await trx`select set_config('app.tenant_id', ${tenantId}, true)`
    return fn(trx)
  })) as T
}
