import { strict as assert } from 'assert';
import { updateMany } from '../actions/update-many';

async function main() {
  let capturedText = '';
  let capturedValues: unknown[] = [];
  const client = {
    async query(text: string, values: unknown[]) {
      capturedText = text;
      capturedValues = values;
      return { rowCount: 2, rows: [{}, {}] };
    }
  };

  await updateMany(client as any, {
    table: 'members',
    expand: { user: {} as any },
    data: [
      { id: 29, user: {}, connected_at: null, meta: '{"a":1}' },
      { id: 30, user: {}, connected_at: null, meta: null }
    ]
  });

  assert.equal(
    capturedText,
    'UPDATE members fromref SET "connected_at" = tmpfromref."connected_at","meta" = tmpfromref."meta" from (values ((SELECT "id" FROM members WHERE false),(SELECT "connected_at" FROM members WHERE false),(SELECT "meta" FROM members WHERE false)),($1,$2,$3),($4,$5,$6)) as tmpfromref("id","connected_at","meta") WHERE fromref."id" = tmpfromref."id" RETURNING fromref.*'
  );
  assert.deepEqual(capturedValues, [29, null, '{"a":1}', 30, null, null]);
  console.log('✓ UPDATE many types every column from its table, including all-null columns');

  await updateMany(client as any, { table: 'members', data: [{ id: 1, 'a" = 1, "b': 'x' }] });
  assert.ok(capturedText.startsWith('UPDATE members fromref SET "a"" = 1, ""b" = tmpfromref."a"" = 1, ""b" from (values ((SELECT "id" FROM members WHERE false),(SELECT "a"" = 1, ""b" FROM members WHERE false)),($1,$2))'));
  console.log('✓ SECURITY: UPDATE many column double quotes are escaped');

  await assert.rejects(
    updateMany(client as any, { table: 'members', data: [{ id: 1, name: 'a' }, { id: 2 }] }),
    /Record 1 is misshapen/
  );
  console.log('✓ UPDATE many rejects misshapen records');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
