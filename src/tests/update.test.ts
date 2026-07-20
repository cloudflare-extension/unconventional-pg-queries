import { strict as assert } from 'assert';
import { update } from '../actions/update';
import { SqlWhereOperator } from '../types/db.types';

async function main() {
  let capturedText = '';
  let capturedValues: unknown[] = [];
  const client = {
    async query(text: string, values: unknown[]) {
      capturedText = text;
      capturedValues = values;
      return { rowCount: 1, rows: [{}] };
    }
  };

  await update(client as any, {
    table: 'users',
    expand: { company: {} as any },
    data: { company: {}, name: 'Alice' },
    where: [{ field: 'id', operator: SqlWhereOperator.Eq, value: 42 }]
  });

  assert.equal(
    capturedText,
    'UPDATE users fromref SET "name" = $1 WHERE fromref."id" = $2 RETURNING *'
  );
  assert.deepEqual(capturedValues, ['Alice', 42]);
  console.log('✓ UPDATE parameters remain contiguous when relation fields are skipped');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
