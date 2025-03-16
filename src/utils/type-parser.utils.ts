import { types } from 'pg';
/**
 * Options for PostgreSQL numeric type parsing
 */
type PgNumericParserOptions = {
  /**
   * How to handle BIGINT values
   * - 'number': Convert to number when within safe integer range
   * - 'string': Always keep as string
   * - 'bigint': Convert to JavaScript BigInt (if supported)
   */
  bigints?: 'number' | 'string' | 'bigint';
};

/**Configures pg library to convert PostgreSQL numeric types to JavaScript numbers*/
export function setupPgNumericParsers(options: PgNumericParserOptions = { bigints: 'number' }) {
  // Parse integers (SMALLINT, INTEGER)
  [21, 23].forEach(typeId => {
    types.setTypeParser(typeId, (val: string | null) => val === null ? null : parseInt(val, 10));
  });
  
  // Parse floats (REAL, DOUBLE PRECISION, NUMERIC)
  [700, 701, 1700].forEach(typeId => {
    types.setTypeParser(typeId, (val: string | null) => val === null ? null : parseFloat(val));
  });
  
  // Handle BIGINT (type 20)
  types.setTypeParser(20, (val: string | null) => {
    if (val === null) return null;
    
    if (options.bigints === 'bigint' && typeof BigInt === 'function') {
      return BigInt(val);
    }
    
    const num = parseInt(val, 10);
    if (options.bigints === 'number' && Number.isSafeInteger(num)) {
      return num;
    }
    
    return val; // Return as string
  });
}