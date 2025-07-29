import { Client } from "pg";
import { FromAlias, compileWhere } from "../utils/query.utils";
import { QueryDefinition } from "../types/db.types";

/** Deletes records from a PostgreSQL database */
export async function destroy(client: Client, body: QueryDefinition): Promise<any> {
  if (!body.where) throw new Error('No id provided');
  const where = compileWhere(body.where, undefined, undefined, body.expand);

  // Return only main table columns when filtering by relations to avoid joined table columns
  const hasRelationFilters = body.where?.some(clause => clause.relationPath);
  const target = hasRelationFilters ? `${FromAlias}.*` : '*';

  const text = `DELETE FROM ${body.table} ${FromAlias} ${where} RETURNING ${target}`;
  const response = await client.query(text);

  return response.rows;
}