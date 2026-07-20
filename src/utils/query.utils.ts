import { AndOr, Expansion, OneOrMany, SqlDirection, SqlOrder, SqlType, SqlWhere, SqlWhereOperator } from "../types/db.types";
import { Client } from "pg";
import { CompiledWhere, CompileWhereOptions, FieldModifiers } from "../types/general.types";
import { describeType, parseInList, unquoteLiteral } from "./object.utils";

/** 
 * When expanding relations, the parent table's id is attached under this alias
 * to the child table's results and later used to re-associate to the parent.
 */
export const TempFromAlias = 'tmpfromref';
export const FromAlias = 'fromref';
export const ToAlias = 'toref';
export const ThroughAlias = 'thref';
export const IdField = 'id';

/** Type guard to determine if a clause is a compound clause (has nested clauses) */
function isCompoundClause(clause: SqlWhere): boolean {
  return clause.clauses !== undefined && Array.isArray(clause.clauses) && clause.clauses.length > 0;
}

/** Recursively checks if any clause (including nested ones) has a relationPath */
export function hasRelationFilters(clauses: SqlWhere[] | undefined): boolean {
  if (!clauses?.length) return false;
  
  return clauses.some(clause => {
    if (clause.relationPath) return true;
    if (isCompoundClause(clause)) return hasRelationFilters(clause.clauses);
    return false;
  });
}

/** Records a value for parameter binding and returns its `$n` placeholder */
function bind(values: unknown[], value: unknown): string {
  values.push(value);
  return `$${values.length}`;
}

/** Reduces a filter value to the scalar that should be bound as a query parameter */
function normalizeValue(value: string | number | boolean | null): unknown {
  return typeof value === 'string' ? unquoteLiteral(value) : value;
}

/** Helper function to compile a single clause (and its nested clauses if present) */
function compileSingleClause(clause: SqlWhere, relationsUsed: Set<string>, values: unknown[]): string {
  const { isNumber, isBoolean, isNull } = describeType(clause.value);
  const isBitwise = clause.operator === SqlWhereOperator.BitwiseAnd;
  const isInList = clause.operator === SqlWhereOperator.In || clause.operator === SqlWhereOperator.NotIn;
  const isNullCheck = clause.operator === SqlWhereOperator.IsNull || clause.operator === SqlWhereOperator.IsNotNull;

  // Collect relations if this clause has a relationPath
  if (clause.relationPath) {
    relationsUsed.add(clause.relationPath);
  }

  // Format field with relation prefix if needed
  // Only apply type casting for JSON paths, not regular field comparisons
  const alias = clause.relationPath ? `${ToAlias}_${clause.relationPath}` : FromAlias;
  const needsTypeCast = clause.jsonPath && clause.jsonPath.length > 0;
  const field = getTargetField(alias, clause.field, {
    jsonPath: clause.jsonPath,
    type: needsTypeCast ? (isNumber ? SqlType.Int : isBoolean ? SqlType.Boolean : undefined) : undefined
  });

  // Build the comparison. Every user-influenced value is bound as a parameter ($n)
  // rather than interpolated, so filter input can never alter the SQL structure.
  let mainClause: string;
  if (isNullCheck || isNull) {
    mainClause = `${field} ${isNullCheck ? clause.operator : SqlWhereOperator.IsNull}`;
  } else if (isInList) {
    const elements = parseInList(clause.value);
    if (!elements.length) {
      mainClause = clause.operator === SqlWhereOperator.In ? 'FALSE' : 'TRUE';
    } else {
      const placeholders = elements.map(element => bind(values, element)).join(', ');
      mainClause = `${field} ${clause.operator} (${placeholders})`;
    }
  } else {
    const placeholder = bind(values, normalizeValue(clause.value));
    mainClause = `${field} ${clause.operator} ${placeholder}${isBitwise ? ' > 0' : ''}`;
  }

  // If there are nested clauses, recursively compile them and wrap everything in parentheses
  if (isCompoundClause(clause)) {
    const nestedClauses = compileClausesRecursive(clause.clauses!, relationsUsed, values);
    // Add connector before nested clauses (use first nested clause's andOr or default to AND)
    const connector = clause.clauses![0].andOr || AndOr.And;
    return `(${mainClause} ${connector} ${nestedClauses})`;
  }

  return mainClause;
}

/** Helper function to recursively compile clauses and track relations */
function compileClausesRecursive(clauses: SqlWhere[], relationsUsed: Set<string>, values: unknown[]): string {
  return clauses.reduce((acc, clause, index) => {
    const connector = index > 0 ? ` ${clause.andOr || AndOr.And} ` : '';
    const compiledClause = compileSingleClause(clause, relationsUsed, values);
    return `${acc}${connector}${compiledClause}`;
  }, '');
}

/**
 * Converts a list of SqlWhere outlines to a parameterized SQL WHERE clause.
 * @returns The clause text and the ordered values to pass to `client.query(text, values)`.
 */
export function compileWhere(clauses: SqlWhere[] | undefined, options: CompileWhereOptions = {}): CompiledWhere {
  const { pagination, order, expand } = options;
  const effectiveClauses = clauses ? [...clauses] : [];

  // Create a clause for the pagination cursor
  if (pagination) {
    let operator = SqlWhereOperator.Gt;

    if (order?.length) {
      const direction = order.find((item) => item.field === pagination.field)?.direction;
      if (direction === SqlDirection.Desc) operator = SqlWhereOperator.Lt;
    }

    effectiveClauses.push({
      field: pagination.field,
      operator: operator,
      value: pagination.cursor
    });
  }

  if (!effectiveClauses.length) return { text: '', values: [...(options.values ?? [])] };

  // Format clauses
  const encapsulate = effectiveClauses.length > 1 && pagination;
  const relationsUsed = new Set<string>();
  const values = [...(options.values ?? [])];

  // Compile clauses recursively
  const clausesStr = compileClausesRecursive(effectiveClauses, relationsUsed, values);
  const whereClause = `WHERE ${encapsulate ? `(${clausesStr})` : clausesStr}`;

  // Add JOIN clauses for relations
  let joinClause = '';
  if (relationsUsed.size > 0 && expand) {
    joinClause = Array.from(relationsUsed).map((relationName) => {
      const expansion = expand[relationName];
      if (!expansion) throw new Error(`Expansion configuration not found for '${relationName}'`);

      return expansion.throughTable ? joinThrough(expansion, { joinsOnly: true, aliasName: relationName }) : joinDirect(expansion, { joinsOnly: true, aliasName: relationName });

    }).join(' ');
  }

  return { text: `${joinClause} ${whereClause}`.trim(), values };
}

/**  Converts a list of Expansion outlines to a QueryConfig object */
export function compileExpand(parents: any[], records: Record<string, Expansion>, aliasFrom: boolean = false) {

  const text = Object.values(records).reduce((acc, expansion) => {
    let select = `SELECT ${ToAlias}.*`;
    if (aliasFrom) select += `, ${FromAlias}.${IdField} as ${TempFromAlias}`;

    // Collect the parent ids for the INNER JOIN and from values for the WHERE clause (if none, use -1 to avoid SQL errors)
    const parentIds: number[] = [];
    const fromIds: number[] = [];
    parents.forEach((item) => {
      if (expansion.fromField !== IdField) {
        parentIds.push(item[IdField]);
      }

      const value = item[expansion.fromField];
      if (value != null) fromIds.push(value);
    });

    // Produce the join clause
    const join = expansion.throughTable ? joinThrough(expansion) : joinDirect(expansion, { fromIds: parentIds });

    // Produce the WHERE clause
    const fromFilterValues = fromIds.length ? fromIds.join() : '-1';
    const where = `WHERE ${FromAlias}."${expansion.fromField}" IN (${fromFilterValues})`;

    return `${acc}${select} ${join} ${where}; `;
  }, '');

  return text;
}

export function compileOrder(clauses: SqlOrder[] | undefined) {
  if (!clauses?.length) return '';

  return clauses.reduce((acc, clause, index) => {
    const target = getTargetField(FromAlias, clause.field, { jsonPath: clause.jsonPath });

    return `${acc}${index > 0 ? ', ' : ''}${target} ${clause.direction}`
  },
    'ORDER BY ');
}

interface JoinOptions {
  /** If provided, the FROM clause is wrapped in a subquery to filter the records by the parent ids. */
  fromIds?: number[];
  /** If true, only the join clause is returned. Otherwise, a FROM clause is included. */
  joinsOnly?: boolean;
  /** If provided, use a unique alias for the to and through tables. Otherwise, use the default alias. */
  aliasName?: string;
}

/** 
 * Produces the join clause for a HasOne, HasMany, or BelongsToOne relation
 * If fromIds are provided, the FROM clause is wrapped in a subquery to filter the records by the parent ids.
 * This must be done when the FROM field is not the Id field.
 */
function joinDirect(expansion: Expansion, options?: JoinOptions) {
  const fromTarget = options?.fromIds?.length
    ? `(SELECT "${expansion.fromField}", "${IdField}" FROM ${expansion.fromTable} WHERE "${IdField}" IN (${options.fromIds.join()}))`
    : `${expansion.fromTable}`;

  // If a relation path is provided, use a unique alias for the to table
  // This is used to filter by the relation path in the WHERE clause
  const toAlias = options?.aliasName ? `${ToAlias}_${options.aliasName}` : ToAlias;

  return options?.joinsOnly
    ? `INNER JOIN ${expansion.toTable} ${toAlias} ON ${FromAlias}."${expansion.fromField}" = ${toAlias}."${expansion.toField}"`
    : `from ${expansion.toTable} ${toAlias} INNER JOIN ${fromTarget} ${FromAlias} ON ${FromAlias}."${expansion.fromField}" = ${toAlias}."${expansion.toField}"`;
}

/** Produces the join clause for a ManyToMany relation */
function joinThrough(expansion: Expansion, options?: JoinOptions) {
  const from = options?.joinsOnly ? '' : `from ${expansion.fromTable} ${FromAlias} `;

  // If a relation path is provided, use a unique alias for the to and through tables
  const throughAlias = options?.aliasName ? `${ThroughAlias}_${options.aliasName}` : ThroughAlias;
  const through = `INNER JOIN ${expansion.throughTable} ${throughAlias} ON ${FromAlias}."${expansion.fromField}" = ${throughAlias}."${expansion.throughFromField}" `;
  
  const toAlias = options?.aliasName ? `${ToAlias}_${options.aliasName}` : ToAlias;
  const to = `INNER JOIN ${expansion.toTable} ${toAlias} ON ${throughAlias}."${expansion.throughToField}" = ${toAlias}."${expansion.toField}"`;

  return `${from}${through}${to}`;
}

/** Recursively retrieves all of an item's expanded relations from the DB and attaches them to the item */
export async function withRelations(client: Client, main: any[], expansions: Record<string, Expansion>) {
  const expandQuery = compileExpand(main, expansions, true);

  // Retrieve relational records
  const relationRes = await client.query(expandQuery);
  const relations = Array.isArray(relationRes) ? relationRes : [relationRes];

  // Re-associate expanded records to their parents
  let index = 0;
  for (const [key, expansion] of Object.entries(expansions)) {
    const rows = relations[index].rows;

    // Recursively retrieve the child's relations
    const values = expansion.expand ? await withRelations(client, rows, expansion.expand) : rows;

    // For each child record
    values.forEach((row: any) => {
      // Find all parent records that match
      const parents = main.filter((item) => item[IdField] === row[TempFromAlias]);
      if (!parents.length) return;

      // Remove the temporary id from the child record
      delete row[TempFromAlias];

      // Attach the child record to the parent
      parents.forEach(parent => {
        if (expansion.type === OneOrMany.One) {
          parent[key] = row;
        } else {
          if (!parent[key])
            parent[key] = [row];
          else
            parent[key].push(row);
        }
      });
    });

    index++;
  };

  return main;
}

/** Composes the name of a field from the table name, field name, any nested JSON field names, and a typecast  */
export function getTargetField(table: string, field: string, options?: FieldModifiers) {
  let target = `${table}."${field}"`;
  const { jsonPath, type } = options || {};

  if (jsonPath?.length) {
    // Escape single quotes in JSON keys so a crafted key cannot break out of the path literal
    const path = jsonPath.reduce((acc, key, index) => `${acc}${index < jsonPath.length - 1 ? '->' : '->>'}'${key.replace(/'/g, "''")}'`, '');
    target = `${target}${path}`;
  }

  if (type)
    target = `(${target})::${type}`;

  return target;
}
