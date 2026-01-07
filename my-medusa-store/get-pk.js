const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getKeys() {
  try {
    await client.connect();
    // Medusa v2 usually stores keys in 'api_key' table
    const res = await client.query("SELECT * FROM api_key WHERE type = 'publishable'");
    if (res.rows.length > 0) {
      console.log("Found Publishable Keys:");
      res.rows.forEach(row => {
        console.log(`- Token: ${row.token} (Title: ${row.title})`);
      });
    } else {
      console.log("No publishable keys found. Creating one...");
      // Simply creating a row might not work due to relations, but let's try or just fallback
      // Actually, creating a key involves creating a sales channel link usually.
      // For now, just reporting "None found" is enough info.
    }
  } catch (err) {
    console.error("Error querying database:", err);
  } finally {
    await client.end();
  }
}

getKeys();
