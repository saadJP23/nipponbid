// One-time import: reads all cars from MySQL and indexes them into Elasticsearch
// Usage: node src/scripts/es-import.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../config/database');
const { es, createIndex, CAR_INDEX } = require('../config/elasticsearch');

async function run() {
  console.log('Starting MySQL → Elasticsearch import...');

  await createIndex();

  const [cars] = await db.query(`
    SELECT c.*,
           ci.url AS primary_image
    FROM cars c
    LEFT JOIN car_images ci ON ci.car_id = c.car_id AND ci.is_primary = 1
  `);

  console.log(`Found ${cars.length} cars in MySQL`);

  if (!cars.length) {
    console.log('No cars to import.');
    process.exit(0);
  }

  // Bulk index in batches of 100
  const BATCH = 100;
  let indexed = 0;

  for (let i = 0; i < cars.length; i += BATCH) {
    const batch = cars.slice(i, i + BATCH);
    const operations = batch.flatMap(car => [
      { index: { _index: CAR_INDEX, _id: String(car.car_id) } },
      car,
    ]);

    const result = await es.bulk({ operations, refresh: true });

    if (result.errors) {
      const failed = result.items.filter(i => i.index?.error);
      console.error(`${failed.length} errors in batch`, failed[0]?.index?.error);
    }

    indexed += batch.length;
    console.log(`Indexed ${indexed}/${cars.length}`);
  }

  console.log(`✅ Import complete — ${indexed} cars indexed into Elasticsearch`);
  process.exit(0);
}

run().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
