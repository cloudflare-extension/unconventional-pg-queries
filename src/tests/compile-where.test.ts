import { compileWhere } from '../utils/query.utils';
import { SqlWhere, SqlWhereOperator, AndOr, SqlDirection, Expansion, OneOrMany } from '../types/db.types';
import { strict as assert } from 'assert';

console.log('Testing compileWhere function...\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${(error as Error).message}\n`);
    failedTests++;
  }
}

// Test 1: Simple WHERE clause
test('Simple WHERE clause with single condition', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 18 }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."age" > $1', values: [18] });
});

// Test 2: Multiple conditions with AND
test('Multiple conditions with AND', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 18 },
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active', andOr: AndOr.And }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."age" > $1 AND fromref."status" = $2', values: [18, 'active'] });
});

// Test 3: Multiple conditions with OR
test('Multiple conditions with OR', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 18 },
    { field: 'age', operator: SqlWhereOperator.Lt, value: 65, andOr: AndOr.Or }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."age" > $1 OR fromref."age" < $2', values: [18, 65] });
});

// Test 4: String values are bound as parameters
test('String values are bound as parameters', () => {
  const clauses: SqlWhere[] = [
    { field: 'name', operator: SqlWhereOperator.Eq, value: 'John' }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."name" = $1', values: ['John'] });
});

// Test 5: LIKE operator
test('LIKE operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'email', operator: SqlWhereOperator.Like, value: '%@example.com' }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."email" LIKE $1', values: ['%@example.com'] });
});

// Test 6: IS NULL operator
test('IS NULL operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'deleted_at', operator: SqlWhereOperator.IsNull, value: null }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."deleted_at" IS NULL', values: [] });
});

// Test 7: IN operator
test('IN operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'id', operator: SqlWhereOperator.In, value: '(1,2,3)' }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."id" IN ($1, $2, $3)', values: [1, 2, 3] });
});

test('Quoted numeric IN elements remain strings', () => {
  const result = compileWhere([
    { field: 'code', operator: SqlWhereOperator.In, value: "('1','2','3')" }
  ]);
  assert.deepEqual(result, {
    text: 'WHERE fromref."code" IN ($1, $2, $3)',
    values: ['1', '2', '3']
  });
});

test('IN elements preserve numeric precision', () => {
  const result = compileWhere([
    {
      field: 'value',
      operator: SqlWhereOperator.In,
      value: '(1,9007199254740993,0.12345678901234567890123456789)'
    }
  ]);
  assert.deepEqual(result, {
    text: 'WHERE fromref."value" IN ($1, $2, $3)',
    values: [1, '9007199254740993', '0.12345678901234567890123456789']
  });
});

// Test 8: Bitwise AND operator
test('Bitwise AND operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'flags', operator: SqlWhereOperator.BitwiseAnd, value: 4 }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."flags" & $1 > 0', values: [4] });
});

// Test 9: Compound clause - basic grouping
test('Compound clause: (age > 18 AND age < 65)', () => {
  const clauses: SqlWhere[] = [
    {
      field: 'age',
      operator: SqlWhereOperator.Gt,
      value: 18,
      clauses: [
        { field: 'age', operator: SqlWhereOperator.Lt, value: 65, andOr: AndOr.And }
      ]
    }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE (fromref."age" > $1 AND fromref."age" < $2)', values: [18, 65] });
});

// Test 10: Multiple compound clauses with OR
test('Multiple compound clauses: (age > 18 AND age < 65) OR (role = admin AND verified = true)', () => {
  const clauses: SqlWhere[] = [
    {
      field: 'age',
      operator: SqlWhereOperator.Gt,
      value: 18,
      clauses: [
        { field: 'age', operator: SqlWhereOperator.Lt, value: 65, andOr: AndOr.And }
      ]
    },
    {
      field: 'role',
      operator: SqlWhereOperator.Eq,
      value: 'admin',
      andOr: AndOr.Or,
      clauses: [
        { field: 'verified', operator: SqlWhereOperator.Eq, value: true, andOr: AndOr.And }
      ]
    }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, {
    text: 'WHERE (fromref."age" > $1 AND fromref."age" < $2) OR (fromref."role" = $3 AND fromref."verified" = $4)',
    values: [18, 65, 'admin', true]
  });
});

// Test 11: Nested compound clauses
test('Nested compound clauses: status = active AND (age > 18 OR (premium = true AND trial = true))', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' },
    {
      field: 'age',
      operator: SqlWhereOperator.Gt,
      value: 18,
      andOr: AndOr.And,
      clauses: [
        {
          field: 'premium',
          operator: SqlWhereOperator.Eq,
          value: true,
          andOr: AndOr.Or,
          clauses: [
            { field: 'trial_active', operator: SqlWhereOperator.Eq, value: true, andOr: AndOr.And }
          ]
        }
      ]
    }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, {
    text: 'WHERE fromref."status" = $1 AND (fromref."age" > $2 OR (fromref."premium" = $3 AND fromref."trial_active" = $4))',
    values: ['active', 18, true, true]
  });
});

// Test 12: JSON path filtering
test('JSON path filtering', () => {
  const clauses: SqlWhere[] = [
    {
      field: 'metadata',
      jsonPath: ['website'],
      operator: SqlWhereOperator.Like,
      value: '%.com'
    }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: `WHERE fromref."metadata"->>'website' LIKE $1`, values: ['%.com'] });
});

// Test 13: Nested JSON path filtering
test('Nested JSON path filtering', () => {
  const clauses: SqlWhere[] = [
    {
      field: 'metadata',
      jsonPath: ['links', 'avatar'],
      operator: SqlWhereOperator.IsNotNull,
      value: null
    }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: `WHERE fromref."metadata"->'links'->>'avatar' IS NOT NULL`, values: [] });
});

// Test 14: Pagination cursor (ASC)
test('Pagination with cursor (ASC)', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' }
  ];
  const result = compileWhere(
    clauses,
    {
      pagination: { field: 'id', cursor: 100 },
      order: [{ field: 'id', direction: SqlDirection.Asc }]
    }
  );
  assert.deepEqual(result, { text: 'WHERE (fromref."status" = $1 AND fromref."id" > $2)', values: ['active', 100] });
});

// Test 15: Pagination cursor (DESC)
test('Pagination with cursor (DESC)', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' }
  ];
  const result = compileWhere(
    clauses,
    {
      pagination: { field: 'created_at', cursor: '2024-01-01' },
      order: [{ field: 'created_at', direction: SqlDirection.Desc }]
    }
  );
  assert.deepEqual(result, { text: 'WHERE (fromref."status" = $1 AND fromref."created_at" < $2)', values: ['active', '2024-01-01'] });
});

// Test 16: Relation filtering
test('Relation filtering with expand', () => {
  const clauses: SqlWhere[] = [
    { field: 'name', operator: SqlWhereOperator.Eq, value: 'Costco', relationPath: 'company' }
  ];
  const expand: Record<string, Expansion> = {
    company: {
      type: OneOrMany.One,
      fromTable: 'users',
      fromField: 'company_id',
      toTable: 'companies',
      toField: 'id'
    }
  };
  const result = compileWhere(clauses, { expand });
  assert.deepEqual(result, {
    text: `INNER JOIN companies toref_company ON fromref."company_id" = toref_company."id" WHERE toref_company."name" = $1`,
    values: ['Costco']
  });
});

// Test 17: Relation filtering with compound clause
test('Relation filtering in compound clause', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 25 },
    {
      field: 'name',
      operator: SqlWhereOperator.Like,
      value: 'Tech%',
      relationPath: 'company',
      andOr: AndOr.And,
      clauses: [
        { field: 'active', operator: SqlWhereOperator.Eq, value: true, relationPath: 'company', andOr: AndOr.And }
      ]
    }
  ];
  const expand: Record<string, Expansion> = {
    company: {
      type: OneOrMany.One,
      fromTable: 'users',
      fromField: 'company_id',
      toTable: 'companies',
      toField: 'id'
    }
  };
  const result = compileWhere(clauses, { expand });
  assert.deepEqual(result, {
    text: `INNER JOIN companies toref_company ON fromref."company_id" = toref_company."id" WHERE fromref."age" > $1 AND (toref_company."name" LIKE $2 AND toref_company."active" = $3)`,
    values: [25, 'Tech%', true]
  });
});

// Test 18: Empty clauses
test('Empty clauses returns empty result', () => {
  const result = compileWhere(undefined);
  assert.deepEqual(result, { text: '', values: [] });
});

// Test 19: Empty array returns empty result
test('Empty array returns empty result', () => {
  const result = compileWhere([]);
  assert.deepEqual(result, { text: '', values: [] });
});

// Test 20: Boolean values
test('Boolean values', () => {
  const clauses: SqlWhere[] = [
    { field: 'is_active', operator: SqlWhereOperator.Eq, value: true }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."is_active" = $1', values: [true] });
});

// Test 21: SECURITY — quote-breaking payload cannot alter SQL structure
test('SECURITY: injection payload becomes a single inert bound parameter', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: "x' or 1=1 --" }
  ];
  const result = compileWhere(clauses);
  // The entire payload is one placeholder; there is no way to reach a tautology or comment.
  assert.deepEqual(result, { text: 'WHERE fromref."status" = $1', values: ["x' or 1=1 --"] });
});

// Test 22: SECURITY — buildFilter-style pre-quoted value is unwrapped, not matched literally with quotes
test('SECURITY: pre-quoted value is unquoted before binding', () => {
  const clauses: SqlWhere[] = [
    { field: 'name', operator: SqlWhereOperator.Eq, value: "'O''Brien'" }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: 'WHERE fromref."name" = $1', values: ["O'Brien"] });
});

// Test 23: SECURITY — crafted JSON key cannot break out of the path literal
test('SECURITY: JSON path key single quotes are escaped', () => {
  const clauses: SqlWhere[] = [
    { field: 'metadata', jsonPath: ["a'||version()||'"], operator: SqlWhereOperator.Eq, value: 'x' }
  ];
  const result = compileWhere(clauses);
  assert.deepEqual(result, { text: `WHERE fromref."metadata"->>'a''||version()||''' = $1`, values: ['x'] });
});

test('IN list supports escaped apostrophes', () => {
  const result = compileWhere([
    { field: 'name', operator: SqlWhereOperator.In, value: "('O''Brien','Alice')" }
  ]);
  assert.deepEqual(result, {
    text: 'WHERE fromref."name" IN ($1, $2)',
    values: ["O'Brien", 'Alice']
  });
});

test('Malformed IN list is rejected', () => {
  assert.throws(
    () => compileWhere([{ field: 'name', operator: SqlWhereOperator.In, value: "('O'Brien','Alice')" }]),
    /unmatched quote/
  );
});

test('Empty IN and NOT IN lists have explicit boolean semantics', () => {
  assert.deepEqual(
    compileWhere([{ field: 'id', operator: SqlWhereOperator.In, value: '()' }]),
    { text: 'WHERE FALSE', values: [] }
  );
  assert.deepEqual(
    compileWhere([{ field: 'id', operator: SqlWhereOperator.NotIn, value: '()' }]),
    { text: 'WHERE TRUE', values: [] }
  );
});

test('Pagination does not mutate the caller clauses', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' }
  ];

  compileWhere(clauses, { pagination: { field: 'id', cursor: 100 } });
  assert.equal(clauses.length, 1);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Total tests: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log('='.repeat(50));

if (failedTests > 0) {
  process.exit(1);
}
