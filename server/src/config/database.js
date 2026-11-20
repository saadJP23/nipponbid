const { Pool, types } = require('pg');
require('dotenv').config();

// pg returns BIGINT (incl. COUNT(*)) as strings by default to avoid precision loss.
// mysql2 returned these as plain numbers, and the app (totals, pagination, counts)
// expects that — safe here since these are row counts, not currency amounts.
types.setTypeParser(20, (val) => parseInt(val, 10));

// The old mysql2 pool used `dateStrings: ['DATE']` so DATE columns came back as plain
// 'YYYY-MM-DD' strings, never JS Date objects — avoiding timezone-shift bugs when later
// serialized to JSON. pg's default DATE parser builds a JS Date (midnight local/UTC),
// which then renders a day off once JSON.stringify()'d. Keep DATE as the raw string to match.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nipponbid',
  // Aiven (and most managed Postgres hosts) require SSL; local Docker Postgres doesn't
  // use it, so this defaults off and is opted into via DB_SSL=true.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
});

// Table -> real primary key column, used to emulate mysql2's `result.insertId`
// after a plain INSERT (see query() below). Keep in sync with database/postgres_schema.sql.
const PK_BY_TABLE = {
  users: 'user_id',
  auctions: 'auction_id',
  cars: 'car_id',
  car_images: 'car_image_id',
  bids: 'bid_id',
  notifications: 'notification_id',
  saved_searches: 'saved_search_id',
  watchlist: 'watchlist_id',
  sub_clients: 'id',
  purchases: 'purchase_id',
  purchase_details: 'purchase_detail_id',
  documents: 'document_id',
  shipping: 'shipping_id',
  bl: 'bl_id',
  remittances: 'remittance_id',
  proforma_invoices: 'proforma_id',
  final_invoices: 'final_invoice_id',
  parts_purchases: 'parts_purchase_id',
  japan_cars: 'id',
  japan_bids: 'id',
  japan_purchases: 'id',
  japan_documents: 'id',
  japan_parts_purchases: 'id',
  shipments: 'id',
  bl_requests: 'id',
};

// Converts mysql2-style `?` positional placeholders to Postgres `$1, $2, ...`,
// skipping `?` that appear inside single-quoted string literals (with '' escaping).
function convertPlaceholders(sql) {
  let out = '';
  let inString = false;
  let n = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      // '' inside a string is an escaped quote, not the string's end
      if (inString && sql[i + 1] === "'") { out += "''"; i++; continue; }
      inString = !inString;
      out += ch;
    } else if (ch === '?' && !inString) {
      n++;
      out += `$${n}`;
    } else {
      out += ch;
    }
  }
  return out;
}

async function query(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const verb = converted.trim().slice(0, 6).toUpperCase();

  if (verb === 'INSERT' && !/\bRETURNING\b/i.test(converted)) {
    const match = converted.match(/^\s*INSERT\s+INTO\s+["`]?(\w+)["`]?/i);
    const pk = match && PK_BY_TABLE[match[1]];
    if (pk) {
      const result = await pool.query(`${converted} RETURNING ${pk} AS insertid`, params);
      const first = result.rows[0] || {};
      return [{ ...first, insertId: first.insertid, affectedRows: result.rowCount }, result.fields];
    }
    const result = await pool.query(converted, params);
    return [{ affectedRows: result.rowCount }, result.fields];
  }

  if ((verb === 'UPDATE' || verb === 'DELETE') && !/\bRETURNING\b/i.test(converted)) {
    const result = await pool.query(converted, params);
    return [{ affectedRows: result.rowCount }, result.fields];
  }

  const result = await pool.query(converted, params);
  return [result.rows, result.fields];
}

pool.connect()
  .then(client => {
    console.log('✅ Postgres connected');
    client.release();
  })
  .catch(err => {
    console.error('❌ Postgres connection error:', err.message);
  });

module.exports = { query, pool };
