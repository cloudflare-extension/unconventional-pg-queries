import { strict as assert } from 'assert';
import { insert } from '../actions/insert';
import { ConflictResolution } from '../types/db.types';

console.log('Testing insert conflict SQL...\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, testFn: () => Promise<void> | void) {
  Promise.resolve()
    .then(testFn)
    .then(() => {
      console.log(`✓ ${name}`);
      passedTests++;
    })
    .catch((error: Error) => {
      console.log(`✗ ${name}`);
      console.error(`  Error: ${error.message}\n`);
      failedTests++;
    })
    .finally(() => {
      if (passedTests + failedTests === 1) {
        console.log(`\nTests complete: ${passedTests} passed, ${failedTests} failed`);
        if (failedTests > 0) process.exit(1);
      }
    });
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
