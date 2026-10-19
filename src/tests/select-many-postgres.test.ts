import { strict as assert } from 'assert';
import { PGlite } from '@electric-sql/pglite';
import type { Client } from 'pg';
import { selectMany } from '../actions/select-many';
import { QueryDefinition, SqlDirection, SqlWhereOperator } from '../types/db.types';

interface Plan {
  'Node Type': string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Rows Removed by Filter'?: number;
  Plans?: Plan[];
}

/** Flattens a PostgreSQL execution plan so assertions inspect work across every node. */
function flatten(plan: Plan): Plan[] {
  return [plan, ...(plan.Plans ?? []).flatMap(flatten)];
}

async function main() {
  const database = new PGlite();
  let statement = '';
  let parameters: unknown[] = [];
  const client = {
    async query(text: string, values: unknown[]) {
      statement = text;
      parameters = values;
      const result = await database.query(text, values);
      return { rows: result.rows, rowCount: result.rows.length };
    }
  } as unknown as Client;

  try {
    // Use native PostgreSQL timestamps and a realistic index rather than approximating a query plan.
    await database.exec(`
      CREATE TABLE orders (id BIGINT PRIMARY KEY, user_id INTEGER NOT NULL, account_id INTEGER NOT NULL,
        placed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL);
      INSERT INTO orders
      SELECT n, 7, n % 5, CASE WHEN n % 3 = 0 THEN NULL ELSE '2026-10-18'::timestamptz - n * interval '1 second' END,
        '2026-10-18'::timestamptz - n * interval '1 second' FROM generate_series(1, 100000) n;
      INSERT INTO orders VALUES (100001, 8, 1, '2026-10-18', '2026-10-18');
      CREATE INDEX orders_user_history ON orders (user_id, COALESCE(placed_at, created_at) DESC, id DESC);
      CREATE INDEX orders_account_history ON orders (user_id, account_id, COALESCE(placed_at, created_at) DESC, id DESC);
      ANALYZE orders;
    `);
    const definition: QueryDefinition = {
      table: 'orders',
      where: [{ field: 'user_id', operator: SqlWhereOperator.Eq, value: 7 }],
      order: [{ field: 'placed_at', coalesce: ['created_at'], direction: SqlDirection.Desc }],
      page: { field: 'id', cursor: 90000 },
      limit: 25
    };

    for (const account of [undefined, 0]) {
      const where = [...(definition.where ?? [])];
      if (account != null) where.push({ field: 'account_id', operator: SqlWhereOperator.Eq, value: account });
      const rows = await selectMany(client, { ...definition, where }) as { id: number }[];
      const step = account == null ? 1 : 5;
      assert.deepEqual(rows.map(row => String(row.id)), Array.from({ length: 25 }, (_, i) => String(90000 + step * (i + 1))));

      const result = await database.query<{ 'QUERY PLAN': { Plan: Plan }[] }>(`EXPLAIN (ANALYZE, FORMAT JSON) ${statement}`, parameters);
      const nodes = flatten(result.rows[0]['QUERY PLAN'][0].Plan);
      const scans = nodes.filter(node => node['Node Type'] === 'Index Scan');
      assert.ok(scans.length > 0, 'A deep page must use an index');
      assert.ok(!nodes.some(node => node['Node Type'] === 'Sort'), 'The index must also provide page ordering');
      const visited = scans.reduce((total, node) => total + ((node['Actual Rows'] ?? 0) + (node['Rows Removed by Filter'] ?? 0)) * (node['Actual Loops'] ?? 0), 0);
      assert.ok(visited <= 26, `A deep page should read 25 results and one anchor, visited ${visited}`);
    }
    console.log('✓ PostgreSQL seeks directly to deep user and account pages');

    // The cursor boundary stays inside PostgreSQL, preserving microseconds and large integer IDs.
    await database.exec(`
      TRUNCATE orders;
      INSERT INTO orders VALUES
        (9007199254740993, 7, 1, '2026-10-18 12:00:00.123457+00', '2026-10-18'),
        (9007199254740994, 7, 1, '2026-10-18 12:00:00.123456+00', '2026-10-18'),
        (9007199254740995, 7, 1, NULL, '2026-10-18 12:00:00.123456+00'),
        (9007199254740996, 8, 1, '2026-10-18', '2026-10-18');
    `);
    // Cast only the output ID to text; predicates still compare the native BIGINT column.
    const precisionClient = {
      async query(text: string, values: unknown[]) {
        const result = await database.query<{ id: string }>(text.replace('SELECT * FROM', 'SELECT fromref.id::text AS id FROM'), values);
        return { rows: result.rows, rowCount: result.rows.length };
      }
    } as unknown as Client;
    for (const direction of [SqlDirection.Desc, SqlDirection.Asc]) {
      const expected = direction === SqlDirection.Desc
        ? ['9007199254740993', '9007199254740995', '9007199254740994']
        : ['9007199254740994', '9007199254740995', '9007199254740993'];
      const actual: string[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 4; page++) {
        const rows = await selectMany(precisionClient, { ...definition, order: [{ field: 'placed_at', coalesce: ['created_at'], direction }], page: cursor ? { field: 'id', cursor } : undefined, limit: 1 }) as { id: string }[] | null;
        if (!rows?.length) break;
        cursor = rows[0].id;
        actual.push(cursor);
      }
      assert.deepEqual(actual, expected);
    }
    for (const cursor of ['9007199254740996', '999']) {
      assert.equal(await selectMany(client, { ...definition, page: { field: 'id', cursor } }), null);
    }
    console.log('✓ PostgreSQL range cursors preserve precision, draft fallback dates, ownership, and missing-anchor behavior');
  } finally {
    await database.close();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
