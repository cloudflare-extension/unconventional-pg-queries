import { strict as assert } from 'assert';
import { DatabaseSync } from 'node:sqlite';
import { Client } from 'pg';
import { selectMany } from '../actions/select-many';
import { AndOr, QueryDefinition, SqlDirection, SqlOrder, SqlWhereOperator } from '../types/db.types';

async function main() {
  const database = new DatabaseSync(':memory:');
  database.exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, placed_at TEXT, created_at TEXT NOT NULL)');
  const insert = database.prepare('INSERT INTO orders VALUES (?, ?, ?, ?)');
  insert.run(1, 7, '2026-10-18T12:00:00.123456Z', '2026-10-18T12:00:00.000000Z');
  insert.run(2, 7, '2026-10-15T12:00:00.000000Z', '2026-10-15T12:00:00.000000Z');
  insert.run(100, 7, '2026-07-15T12:00:00.000000Z', '2026-10-18T14:00:00.000000Z');
  insert.run(101, 7, '2026-10-15T12:00:00.000000Z', '2026-10-15T12:00:00.000000Z');
  insert.run(200, 7, null, '2026-09-01T12:00:00.000000Z');
  insert.run(201, 7, null, '2026-10-18T15:00:00.000000Z');
  insert.run(203, 7, '2026-10-18T12:00:00.123457Z', '2026-10-18T12:00:00.000000Z');
  insert.run(300, 8, '2026-10-19T12:00:00.000000Z', '2026-10-19T12:00:00.000000Z');
  let queries = 0;

  // Execute the generated SQL, adapting only placeholders and PostgreSQL's default null placement.
  const client = {
    async query(text: string, values: unknown[]) {
      queries++;
      const parameters: unknown[] = [];
      const sql = text.replace(/\$(\d+)/g, (_, index) => { parameters.push(values[Number(index) - 1]); return '?'; })
        .replace(/\b(ASC|DESC)\b/g, direction => `${direction} NULLS ${direction === 'DESC' ? 'FIRST' : 'LAST'}`);
      const rows = database.prepare(sql).all(...parameters);
      return { rowCount: rows.length, rows };
    }
  } as unknown as Client;
  const descending: SqlOrder = { field: 'placed_at', coalesce: ['created_at'], direction: SqlDirection.Desc };
  const definition: QueryDefinition = {
    table: 'orders',
    where: [{ field: 'user_id', operator: SqlWhereOperator.Eq, value: 7 }]
  };
  const scenarios: { name: string; order: SqlOrder[]; expected: number[] }[] = [
    { name: 'COALESCE dates, drafts, timestamp ties, and backfilled IDs', order: [descending], expected: [201, 203, 1, 101, 2, 200, 100] },
    { name: 'ascending date and ID order', order: [{ ...descending, direction: SqlDirection.Asc }], expected: [100, 200, 2, 101, 1, 203, 201] },
    { name: 'mixed sort directions', order: [descending, { field: 'id', direction: SqlDirection.Asc }], expected: [201, 203, 1, 2, 101, 200, 100] },
    { name: 'ID-only sorting', order: [{ field: 'id', direction: SqlDirection.Desc }], expected: [203, 201, 200, 101, 100, 2, 1] }
  ];

  try {
    for (const scenario of scenarios) {
      for (const limit of [1, 3]) {
        const ids: number[] = [];
        let cursor: number | undefined;
        for (let page = 0; page <= scenario.expected.length; page++) {
          const before = queries;
          const rows = await selectMany(client, { ...definition, order: scenario.order, limit, page: cursor == null ? undefined : { field: 'id', cursor } }) as { id: number }[] | null;
          assert.equal(queries - before, 1, 'Pagination uses one database query');
          if (!rows?.length) break;
          assert.deepEqual(Object.keys(rows[0]).sort(), ['created_at', 'id', 'placed_at', 'user_id']);
          ids.push(...rows.map(row => row.id));
          cursor = rows[rows.length - 1].id;
        }
        assert.deepEqual(ids, scenario.expected, `${scenario.name}, page size ${limit}`);
      }
      console.log(`✓ One-query cursor follows ${scenario.name}`);
    }

    for (const cursor of [300, 999, "1' OR true --"]) {
      assert.equal(await selectMany(client, { ...definition, order: [descending], page: { field: 'id', cursor } }), null);
    }
    const disjunction: QueryDefinition = { ...definition, where: [
      { field: 'id', operator: SqlWhereOperator.Eq, value: 1 },
      { field: 'id', operator: SqlWhereOperator.Eq, value: 2, andOr: AndOr.Or }
    ] };
    const rows = await selectMany(client, { ...disjunction, order: [descending], page: { field: 'id', cursor: 1 } }) as { id: number }[];
    assert.deepEqual(rows.map(row => row.id), [2], 'OR filters are grouped before the cursor condition');
    const idRows = await selectMany(client, { ...definition, order: [{ field: 'id', direction: SqlDirection.Desc }], page: { field: 'id', cursor: 999 }, limit: 1 }) as { id: number }[];
    assert.deepEqual(idRows.map(row => row.id), [203], 'ID-only cursors do not require an anchor row');

    database.exec("CREATE TABLE custom_orders (key INTEGER PRIMARY KEY, date TEXT); INSERT INTO custom_orders VALUES (9, '2026-01-01'), (1, '2026-10-18')");
    const custom: QueryDefinition = { table: 'custom_orders', idField: 'key', order: [{ field: 'date', direction: SqlDirection.Desc }], limit: 1 };
    const first = await selectMany(client, custom) as { key: number }[];
    const second = await selectMany(client, { ...custom, page: { field: 'key', cursor: first[0].key } }) as { key: number }[];
    assert.deepEqual([first[0].key, second[0].key], [1, 9]);
    console.log('✓ Filters, missing cursors, custom IDs, and response columns retain their contracts');
  } finally {
    database.close();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
