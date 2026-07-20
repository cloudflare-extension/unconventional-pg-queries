import { QueryDefinition, SubAction } from "../types/db.types";
import { Client } from "pg";
import { FromAlias, compileWhere, hasRelationFilters } from "../utils/query.utils";

/** Updates one record in a PostgreSQL database */
export async function update(client: Client, body: QueryDefinition) {
  if (!body.data) throw new Error('No data provided');
  const data = Array.isArray(body.data) ? body.data[0] : body.data;

  if (!body.where) throw new Error('No id provided');

  // Return only main table columns when filtering by relations to avoid joined table columns
  const hasRelations = hasRelationFilters(body.where);
  const returning = hasRelations ? `${FromAlias}.*` : '*';

  const assignments: string[] = [];
  const values: unknown[] = [];

  // Concatenate field names and values
  Object.entries(data).forEach(([key, value]) => {
    if (body.expand?.[key]) return; // Exclude relations

    const increment = body.subAction === SubAction.Increment;
    values.push(increment ? Number(value) || 0 : value ?? null);
    const placeholder = `$${values.length}`;
    const valueHolder = increment ? `"${key}" + ${placeholder}` : placeholder;

    assignments.push(`"${key}" = ${valueHolder}`);
  });

  if (!assignments.length) throw new Error('No columns to update');

  const where = compileWhere(body.where, { expand: body.expand, values });

  const text = `UPDATE ${body.table} ${FromAlias} SET ${assignments.join(', ')} ${where.text} RETURNING ${returning}`;
  const response = await client.query(text, where.values);

  return response.rowCount === 1 ? response.rows[0] : response.rows;
}
