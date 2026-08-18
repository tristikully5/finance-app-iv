require("dotenv").config();
const { Client } = require("pg");

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );

  for (const row of result.rows) {
    console.log(row.table_name);
  }

  await client.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
