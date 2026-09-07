/**
 * One shared ephemeral Mongo for the whole run — avoids paying the
 * mongodb-memory-server cold start once per test file (which was tripping the
 * beforeAll hook timeout on slower machines).
 *
 * If MONGO_URI_TEST is already set (CI / a throwaway Atlas db) this is a no-op.
 */
let server = null;

export async function setup() {
  if (process.env.MONGO_URI_TEST) return;
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    server = await MongoMemoryServer.create();
    process.env.MONGO_URI_TEST = server.getUri();
  } catch {
    throw new Error('Set MONGO_URI_TEST or install mongodb-memory-server (npm i -D mongodb-memory-server).');
  }
}

export async function teardown() {
  if (server) await server.stop();
}
