import { strict as assert } from 'assert';
import { insert } from '../actions/insert';
import { ConflictResolution } from '../types/db.types';

console.log('Testing insert conflict SQL...\n');

let passedTests = 0;
let failedTests = 0;

const tests: Promise<void>[] = [];

function test(name: string, testFn: () => Promise<void> | void) {
  tests.push(Promise.resolve()
    .then(testFn)
    .then(() => {
      console.log(`✓ ${name}`);
      passedTests++;
    })
    .catch((error: Error) => {
      console.log(`✗ ${name}`);
      console.error(`  Error: ${error.message}\n`);
      failedTests++;
    }));
}

test('insert includes a conflict predicate when provided', async () => {
  let executedText = '';
  let executedValues: unknown[] = [];
  const client = {
    query: async (text: string, values: unknown[]) => {
      executedText = text;
      executedValues = values;
      return { rows: [] };
    }
  };

  await insert(client as any, {
    table: 'public.trade',
    data: {
      external_id: 'abc',
      account_id: 1,
      status: 'placed'
    },
    conflict: {
      action: ConflictResolution.doNothing,
      constraint: ['external_id', 'account_id'],
      where: "external_id IS NOT NULL AND external_id <> ''"
    }
  });

  assert.equal(
    executedText,
    `INSERT INTO public.trade ("external_id","account_id","status") VALUES ($1,$2,$3) ON CONFLICT ("external_id","account_id") WHERE (external_id IS NOT NULL AND external_id <> '') DO NOTHING RETURNING *`
  );
  assert.deepEqual(executedValues, ['abc', 1, 'placed']);
});

test('SECURITY: insert column and conflict key double quotes are escaped', async () => {
  let executedText = '';
  const client = {
    query: async (text: string) => {
      executedText = text;
      return { rows: [] };
    }
  };

  await insert(client as any, {
    table: 'users',
    data: { 'name") VALUES (1); --': 'x' },
    conflict: { action: ConflictResolution.doUpdate, constraint: ['id") DO NOTHING; --'] }
  });

  assert.equal(
    executedText,
    `INSERT INTO users ("name"") VALUES (1); --") VALUES ($1) ON CONFLICT ("id"") DO NOTHING; --") DO UPDATE SET "name"") VALUES (1); --" = EXCLUDED."name"") VALUES (1); --" RETURNING *`
  );
});

Promise.all(tests).then(() => {
  console.log(`\nTests complete: ${passedTests} passed, ${failedTests} failed`);
  if (failedTests > 0) process.exit(1);
});
