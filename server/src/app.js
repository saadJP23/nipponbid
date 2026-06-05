require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const cron    = require('node-cron');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app')))
      cb(null, true);
    else cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/image-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).end();
  // Local path — serve from disk if it exists
  if (url.startsWith('/uploads/')) {
    const fs = require('fs');
    const localFile = path.join(__dirname, '..', url);
    if (fs.existsSync(localFile)) return res.sendFile(localFile);
    return res.status(404).end();
  }
  try {
    const axios = require('axios');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'Referer': 'https://www.shinchuo.jp/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      validateStatus: s => s === 200,
    });
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch {
    res.status(404).end();
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/remittances', require('./routes/remittances'));
app.use('/api/saved-searches', require('./routes/savedSearches'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/sub-clients', require('./routes/subClients'));
app.use('/api/japan',   require('./routes/japan'));
app.use('/api/yahoo',      require('./routes/yahoo.routes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const db = require('./config/database');

// Auto-migration: rename commission → others_commission in purchase_details
(async () => {
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='purchase_details' AND COLUMN_NAME='commission'"
    );
    if (cols.length) {
      await db.query(
        'ALTER TABLE purchase_details CHANGE commission others_commission DECIMAL(14,2) DEFAULT 0'
      );
      console.log('✅ Migration: purchase_details.commission → others_commission');
    }
  } catch (e) {
    console.error('Migration error:', e.message);
  }
})();

app.listen(PORT, () => console.log(`🚀 NipponBid server running on port ${PORT}`));
