import { AndOr, Expansion, OneOrMany, SqlDirection, SqlOrder, SqlPaginate, SqlType, SqlWhere, SqlWhereOperator } from "../types/db.types";
import { Client } from "pg";
import { FieldModifiers } from "../types/general.types";
import { describeType } from "./object.utils";

/** 
 * When expanding relations, the parent table's id is attached under this alias
 * to the child table's results and later used to re-associate to the parent.
 */
export const TempFromAlias = 'tmpfromref';
export const FromAlias = 'fromref';
export const ToAlias = 'toref';
export const ThroughAlias = 'throughref';
export const IdField = 'id';

/**  Converts a list of SqlWhere outlines to string of SQL clauses */
export function compileWhere(clauses: SqlWhere[] | undefined, pagination?: SqlPaginate, order?: SqlOrder[]) {

  // Create a clause for the pagination cursor
  if (pagination) {
    let operator = SqlWhereOperator.Gt;

    if (order?.length) {
      const direction = order.find((item) => item.field === pagination.field)?.direction;
      if (direction === SqlDirection.Desc) operator = SqlWhereOperator.Lt;
    }

    clauses ||= [];
    clauses.push({
      field: pagination.field,
      operator: operator,
      value: pagination.cursor
    });
  }

  if (!clauses?.length) return '';

  // Format clauses
  const encapsulate = clauses.length > 1 && pagination;
  return clauses.reduce((acc, clause, index) => {
    let value = clause.value;
    const { isString, isNumber, isBoolean, isNull } = describeType(value);
    const isBitwise = clause.operator === SqlWhereOperator.BitwiseAnd;
    const isArray = [SqlWhereOperator.In, SqlWhereOperator.NotIn].includes(clause.operator);

    // Format field
    const field = getTargetField(FromAlias, clause.field, {
      jsonPath: clause.jsonPath,
      type: isNumber ? SqlType.Int : isBoolean ? SqlType.Boolean : undefined
    });

    // Format value
    if (!isArray && !isNull && !isNumber && !isBoolean && !isString) {
      value = `'${clause.value}'`;
    }

    const lastClause = clauses && (clauses.length - 1 === index);

    return `${acc}${encapsulate && lastClause ? ')' : ''}${index > 0 ? ` ${clause.andOr || AndOr.And} ` : ''}${field} ${clause.operator} ${value || ''}${isBitwise ? ' > 0' : ''}`
  },
    `WHERE ${encapsulate ? '(' : ''}`);
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
    const join = expansion.throughTable ? joinThrough(expansion) : joinDirect(expansion, parentIds);

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

/** 
 * Produces the join clause for a HasOne, HasMany, or BelongsToOne relation
 * If fromIds are provided, the FROM clause is wrapped in a subquery to filter the records by the parent ids.
 * This must be done when the FROM field is not the Id field.
 */
function joinDirect(expansion: Expansion, fromIds?: number[]) {
  const fromTarget = fromIds?.length
    ? `(SELECT "${expansion.fromField}", "${IdField}" FROM ${expansion.fromTable} WHERE "${IdField}" IN (${fromIds.join()}))`
    : `${expansion.fromTable}`;

  return `from ${expansion.toTable} ${ToAlias} INNER JOIN ${fromTarget} ${FromAlias} ON ${FromAlias}."${expansion.fromField}" = ${ToAlias}."${expansion.toField}"`;
}

/** Produces the join clause for a ManyToMany relation */
function joinThrough(expansion: Expansion) {
  return `from ${expansion.fromTable} ${FromAlias} INNER JOIN ${expansion.throughTable} ${ThroughAlias} ON ${FromAlias}."${expansion.fromField}" = ${ThroughAlias}."${expansion.throughFromField}" INNER JOIN ${expansion.toTable} ${ToAlias} ON ${ThroughAlias}."${expansion.throughToField}" = ${ToAlias}."${expansion.toField}"`;
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
      // Find the parent record
      const parent = main.find((item) => item[IdField] === row[TempFromAlias]);
      if (!parent) return;

      // Remove the temporary id from the child record
      delete row[TempFromAlias];

      // Attach the child record to the parent
      if (expansion.type === OneOrMany.One) {
        parent[key] = row;
      } else {
        if (!parent[key])
          parent[key] = [row];
        else
          parent[key].push(row);
      }
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
    const path = jsonPath.reduce((acc, key, index) => `${acc}${index < jsonPath.length - 1 ? '->' : '->>'}'${key}'`, '');
    target = `${target}${path}`;
  }

  if (type)
    target = `(${target})::${type}`;

  return target;
}