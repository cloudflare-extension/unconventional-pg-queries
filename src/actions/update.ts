import { QueryDefinition, SubAction } from "../types/db.types";
import { Client } from "pg";
import { FromAlias, compileWhere } from "../utils/query.utils";

/** Updates one record in a PostgreSQL database */
export async function update(client: Client, body: QueryDefinition) {
  if (!body.data) throw new Error('No data provided');
  const data = Array.isArray(body.data) ? body.data[0] : body.data;

  if (!body.where) throw new Error('No id provided');
  const where = compileWhere(body.where, undefined, undefined, body.expand);
  
  // Return only main table columns when filtering by relations to avoid joined table columns
  const hasRelationFilters = body.where?.some(clause => clause.relationPath);
  const returning = hasRelationFilters ? `${FromAlias}.*` : '*';

  let columns = '',
    values: any[] = [];

  // Concatenate field names and values
  Object.entries(data).forEach(([key, value], index) => {
    if (body.expand?.[key]) return; // Exclude relations

    let valueHolder = `$${index + 1}`;  
    // Increment value if subAction is set
    if (body.subAction === SubAction.Increment) {
      valueHolder = `"${key}" + $${index + 1}`
      value = Number(value) || 0; 
    }

    columns += `, "${key}" = ${valueHolder}`;
    values.push(value ?? null);
  });

  const text = `UPDATE ${body.table} ${FromAlias} SET ${columns.slice(2)} ${where} RETURNING ${returning}`;
  const response = await client.query(text, values);

  return response.rowCount === 1 ? response.rows[0] : response.rows;
}