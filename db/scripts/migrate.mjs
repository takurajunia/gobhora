import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: "./db/migrations",
    });

    const applied = await pool.query(
      "select count(*)::int as n from drizzle.__drizzle_migrations",
    );
    const tables = await pool.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );

    console.log(`✓ Migrations up to date (${applied.rows[0].n} applied)`);
    console.log(`  Tables: ${tables.rows.map((r) => r.table_name).join(", ")}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`✗ Migration failed: ${err.message}`);
  process.exitCode = 1;
});
