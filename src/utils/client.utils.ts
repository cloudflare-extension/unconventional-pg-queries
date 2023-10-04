import { Client } from "pg";
import { CallConfig, Env, PgFunction } from "../types/general.types";

export function createClient(env: Env) {
  return new Client({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    port: parseInt(env.DB_PORT),
    ssl: true
  });
}

export async function pgCall<In, Out>(fn: PgFunction<In, Out>, data: In, env: Env, ctx: ExecutionContext, config?: CallConfig) {
  // Connect to the database.
  var client = createClient(env);
  await client.connect();

  try {
    // Query the database.
    if (config?.transaction) await client.query('BEGIN');
    const result = await fn(client, data);
    if (config?.transaction) await client.query('COMMIT');

    // Clean up the client, ensuring we don't kill the worker before that is completed.
    ctx.waitUntil(client.end());

    // Return the response.
    return new Response(JSON.stringify(result), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    });
  } catch (err: any) {
    if (config?.transaction) await client.query('ROLLBACK');

    console.error(err);
    ctx.waitUntil(client.end());

    return new Response("Request failed", { status: 409 });
  }
}