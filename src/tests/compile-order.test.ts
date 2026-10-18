import { strict as assert } from 'assert';
import { compileOrder } from '../utils/query.utils';
import { SqlDirection } from '../types/db.types';

assert.equal(compileOrder([
  { field: 'placed_at', coalesce: ['created_at', 'updated_at'], direction: SqlDirection.Desc },
  { field: 'id', direction: SqlDirection.Desc }
]), 'ORDER BY COALESCE(fromref."placed_at", fromref."created_at", fromref."updated_at") DESC, fromref."id" DESC');

assert.equal(compileOrder([
  { field: 'placed_at', coalesce: [], direction: SqlDirection.Asc }
]), 'ORDER BY fromref."placed_at" ASC');

console.log('✓ ORDER BY uses the primary field followed by COALESCE fallbacks');
