import { compileWhere } from './src/utils/query.utils';
import { SqlWhere, SqlWhereOperator, AndOr, SqlDirection, Expansion, OneOrMany } from './src/types/db.types';
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
  assert.equal(result, 'WHERE fromref."age" > 18');
});

// Test 2: Multiple conditions with AND
test('Multiple conditions with AND', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 18 },
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active', andOr: AndOr.And }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, "WHERE fromref.\"age\" > 18 AND fromref.\"status\" = 'active'");
});

// Test 3: Multiple conditions with OR
test('Multiple conditions with OR', () => {
  const clauses: SqlWhere[] = [
    { field: 'age', operator: SqlWhereOperator.Gt, value: 18 },
    { field: 'age', operator: SqlWhereOperator.Lt, value: 65, andOr: AndOr.Or }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, 'WHERE fromref."age" > 18 OR fromref."age" < 65');
});

// Test 4: String values with quotes
test('String values are properly quoted', () => {
  const clauses: SqlWhere[] = [
    { field: 'name', operator: SqlWhereOperator.Eq, value: 'John' }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, "WHERE fromref.\"name\" = 'John'");
});

// Test 5: LIKE operator
test('LIKE operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'email', operator: SqlWhereOperator.Like, value: '%@example.com' }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, "WHERE fromref.\"email\" LIKE '%@example.com'");
});

// Test 6: IS NULL operator
test('IS NULL operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'deleted_at', operator: SqlWhereOperator.IsNull, value: null }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, 'WHERE fromref."deleted_at" IS NULL');
});

// Test 7: IN operator
test('IN operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'id', operator: SqlWhereOperator.In, value: '(1,2,3)' }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, 'WHERE fromref."id" IN (1,2,3)');
});

// Test 8: Bitwise AND operator
test('Bitwise AND operator', () => {
  const clauses: SqlWhere[] = [
    { field: 'flags', operator: SqlWhereOperator.BitwiseAnd, value: 4 }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, 'WHERE fromref."flags" & 4 > 0');
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
  assert.equal(result, 'WHERE (fromref."age" > 18 AND fromref."age" < 65)');
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
  assert.equal(result, "WHERE (fromref.\"age\" > 18 AND fromref.\"age\" < 65) OR (fromref.\"role\" = 'admin' AND fromref.\"verified\" = true)");
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
  assert.equal(result, "WHERE fromref.\"status\" = 'active' AND (fromref.\"age\" > 18 OR (fromref.\"premium\" = true AND fromref.\"trial_active\" = true))");
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
  assert.equal(result, "WHERE fromref.\"metadata\"->>'website' LIKE '%.com'");
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
  assert.equal(result, "WHERE fromref.\"metadata\"->'links'->>'avatar' IS NOT NULL");
});

// Test 14: Pagination cursor (ASC)
test('Pagination with cursor (ASC)', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' }
  ];
  const result = compileWhere(
    clauses,
    { field: 'id', cursor: 100 },
    [{ field: 'id', direction: SqlDirection.Asc }]
  );
  assert.equal(result, "WHERE (fromref.\"status\" = 'active' AND fromref.\"id\" > 100)");
});

// Test 15: Pagination cursor (DESC)
test('Pagination with cursor (DESC)', () => {
  const clauses: SqlWhere[] = [
    { field: 'status', operator: SqlWhereOperator.Eq, value: 'active' }
  ];
  const result = compileWhere(
    clauses,
    { field: 'created_at', cursor: '2024-01-01' },
    [{ field: 'created_at', direction: SqlDirection.Desc }]
  );
  assert.equal(result, "WHERE (fromref.\"status\" = 'active' AND fromref.\"created_at\" < '2024-01-01')");
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
  const result = compileWhere(clauses, undefined, undefined, expand);
  assert.equal(result, "INNER JOIN companies toref_company ON fromref.\"company_id\" = toref_company.\"id\" WHERE toref_company.\"name\" = 'Costco'");
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
  const result = compileWhere(clauses, undefined, undefined, expand);
  assert.equal(result, "INNER JOIN companies toref_company ON fromref.\"company_id\" = toref_company.\"id\" WHERE fromref.\"age\" > 25 AND (toref_company.\"name\" LIKE 'Tech%' AND toref_company.\"active\" = true)");
});

// Test 18: Empty clauses
test('Empty clauses returns empty string', () => {
  const result = compileWhere(undefined);
  assert.equal(result, '');
});

// Test 19: Empty array returns empty string
test('Empty array returns empty string', () => {
  const result = compileWhere([]);
  assert.equal(result, '');
});

// Test 20: Boolean values
test('Boolean values', () => {
  const clauses: SqlWhere[] = [
    { field: 'is_active', operator: SqlWhereOperator.Eq, value: true }
  ];
  const result = compileWhere(clauses);
  assert.equal(result, 'WHERE fromref."is_active" = true');
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

