import { SqlType } from "../types/db.types";
import { TypeDescriptor } from "../types/general.types";

/** Matches a date string in the ISO format YYYY-MM-DDTHH:MM:SS.sssZ */
const datePattern = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d{3}Z/;

/** Converts a JavaScript value to a SQL type */
export function getType(value: any) {
  if (value == null) return '';

  switch (typeof value) {
    case 'boolean': return SqlType.Boolean;
    case 'number': return Number.isSafeInteger(value) ? SqlType.Int : SqlType.Float;
    case 'string': return datePattern.test(value) ? SqlType.Timestamp : SqlType.Text;
    case 'object': return value instanceof Date ? SqlType.Timestamp : SqlType.Jsonb;
    default: return '';
  }
}

/** Ascertains the type of a given value and returns a list of booleans for each possibility */
export function describeType(value: string | number | boolean | null): TypeDescriptor {
  return {
    isString: value ? value.toString().startsWith("'") : false,
    isNumber: value ? !isNaN(+value) : false,
    isBoolean: value ? typeof value === 'boolean' || value.toString().toLowerCase() === 'true' || value.toString().toLowerCase() === 'false' : false,
    isNull: value == null
  };
}

/** Returns true if the given object has no enumerable properties */
export function isEmpty(obj: any) {
  for (const key in obj) return false;
  return true;
}

/** Unquotes a SQL string literal before parameter binding. */
export function unquoteLiteral(value: string): string {
  return value.length >= 2 && value.startsWith("'") && value.endsWith("'")
    ? value.slice(1, -1).replace(/''/g, "'")
    : value;
}

const numberLiteralPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
type SqlLiteral = string | number | boolean | null;

function parseInElement(token: string): SqlLiteral {
  const value = token.trim();
  if (!value) throw new Error('Invalid IN-list literal: empty element');

  if (value.startsWith("'") && value.endsWith("'")) return unquoteLiteral(value);

  if (numberLiteralPattern.test(value)) {
    const number = Number(value);
    // Preserve values that JavaScript cannot represent exactly; PostgreSQL will
    // infer their numeric type from the field being compared.
    if (Number.isFinite(number) && number.toString() === value.replace(/^\+/, '')) return number;
  }

  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'null') return null;
  return value;
}

/** Parses the legacy SQL-like representation of an IN list. */
export function parseInList(raw: SqlLiteral): SqlLiteral[] {
  if (raw == null) return [];

  let source = `${raw}`.trim();
  if (source.startsWith('(') && source.endsWith(')')) source = source.slice(1, -1);
  if (source.trim() === '') return [];

  const values: SqlLiteral[] = [];
  let start = 0;
  let inQuote = false;

  for (let i = 0; i < source.length; i++) {
    if (source[i] === "'") {
      if (inQuote && source[i + 1] === "'") {
        i++;
        continue;
      }
      inQuote = !inQuote;
    }

    if (source[i] === ',' && !inQuote) {
      values.push(parseInElement(source.slice(start, i)));
      start = i + 1;
    }
  }

  if (inQuote) throw new Error('Invalid IN-list literal: unmatched quote');
  values.push(parseInElement(source.slice(start)));
  return values;
}
