import { QueryDefinition } from "../types/db.types";
import { Client } from "pg";
import { isEmpty } from "../utils/object.utils";
import { FromAlias, compileWhere, withRelations, hasRelationFilters } from "../utils/query.utils";

/** Retrieves one record from a PostgreSQL database */
export async function selectOne(client: Client, body: QueryDefinition) {
  const where = compileWhere(body.where, undefined, undefined, body.expand);
  
  // Select only main table columns when filtering by relations to avoid joined table columns
  const hasRelations = hasRelationFilters(body.where);
  const target = hasRelations ? `${FromAlias}.*` : '*';

  const mainRes = await client.query(`SELECT ${target} FROM ${body.table} ${FromAlias} ${where} LIMIT 1`);
  const main = mainRes.rows[0];
  if (!main) return null;

  const expansions = body.expand;
  if (expansions && !isEmpty(expansions)) {
    const expanded = await withRelations(client, [main], expansions);
    return expanded[0];
  }

  return main;
}