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
app.listen(PORT, () => console.log(`🚀 NipponBid server running on port ${PORT}`));
