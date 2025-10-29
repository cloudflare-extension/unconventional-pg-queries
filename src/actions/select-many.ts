import { QueryDefinition, SubAction } from "../types/db.types";
import { Client } from "pg";
import { isEmpty } from "../utils/object.utils";
import { FromAlias, compileOrder, compileWhere, withRelations, hasRelationFilters } from "../utils/query.utils";

/** Retrieves multiple records from a PostgreSQL database */
export async function selectMany(client: Client, body: QueryDefinition) {
  const where = compileWhere(body.where, body.page, body.order, body.expand);
  const limit = body.limit ? `LIMIT ${body.limit}` : '';
  const order = compileOrder(body.order);
  const count = body.subAction === SubAction.Count;
  
  // Select only main table columns when filtering by relations to avoid joined table columns
  const hasRelations = hasRelationFilters(body.where);
  const target = count ? 'COUNT(*)' : hasRelations ? `${FromAlias}.*` : '*';

  // Retrieve main records
  const mainRes = await client.query(`SELECT ${target} FROM ${body.table} ${FromAlias} ${where} ${order} ${limit}`);
  if (mainRes.rowCount === 0) return null;
  const main = mainRes.rows;

  if (count) return main[0];

  const expansions = body.expand;
  return expansions && !isEmpty(expansions) ? await withRelations(client, main, expansions) : main;
}