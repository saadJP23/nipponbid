

require('dotenv').config();
const axios   = require('axios');
const cheerio = require('cheerio');
const db      = require('../config/database');
const fs      = require('fs');
const path    = require('path');

const IMG_DIR = path.join(__dirname, '../../uploads/shinchuo/images');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

async function downloadImage(url, pid, ua, referer) {
  if (!url) return null;
  const ext  = '.jpg';
  const dest = path.join(IMG_DIR, `${pid}${ext}`);
  if (fs.existsSync(dest)) return `/uploads/shinchuo/images/${pid}${ext}`;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': ua,
        'Referer':    referer || 'https://www.shinchuo.jp/',
        'Accept':     'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      validateStatus: s => s === 200,
    });
    fs.writeFileSync(dest, res.data);
    return `/uploads/shinchuo/images/${pid}${ext}`;
  } catch {
    return null;
  }
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9', 'en-GB,en;q=0.9,ja;q=0.8',
  'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  'en-AU,en;q=0.9', 'en-CA,en;q=0.9,fr-CA;q=0.8',
];

const MIN_DELAY = 1800;
const MAX_DELAY = 4500;
const PAUSE_EVERY = 15;
const LONG_PAUSE_MIN = 8000;
const LONG_PAUSE_MAX = 18000;

const BASE_URL    = 'https://shinchuo.jp';
const SEARCH_URL  = `${BASE_URL}/clients/car-list-filters`;
const BATCH_SIZE  = 50;

const rand    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randUA  = () => USER_AGENTS[rand(0, USER_AGENTS.length - 1)];
const randLang = () => ACCEPT_LANGUAGES[rand(0, ACCEPT_LANGUAGES.length - 1)];
const sleep   = (ms) => new Promise(r => setTimeout(r, ms));
const jitter  = () => sleep(rand(MIN_DELAY, MAX_DELAY));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseMileage(str) {
  if (!str) return null;
  const m = str.replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function parseDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return str.substring(0, 10);
  return null;
}

class StealthSession {
  constructor() {
    this.cookies   = {};
    this.csrfToken = null;
    this.ua        = randUA();
    this.lang      = randLang();
    this.requestCount = 0;
  }

  saveCookies(header) {
    for (const s of [].concat(header || [])) {
      const [kv] = s.split(';');
      const eq = kv.indexOf('=');
      if (eq > 0) {
        const k = kv.slice(0, eq).trim();
        const v = kv.slice(eq + 1).trim();
        this.cookies[k] = v;
      }
    }
  }

  cookieStr() {
    return Object.entries(this.cookies).map(([k,v]) => `${k}=${v}`).join('; ');
  }

  baseHeaders(extra = {}) {
    if (this.requestCount > 0 && this.requestCount % rand(40, 80) === 0) {
      this.ua   = randUA();
      this.lang = randLang();
    }
    this.requestCount++;

    return {
      'User-Agent':      this.ua,
      'Accept-Language': this.lang,
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control':   'no-cache',
      'Pragma':          'no-cache',
      'Sec-Fetch-Site':  'same-origin',
      'Sec-Fetch-Mode':  'navigate',
      'Sec-Fetch-Dest':  'document',
      'Upgrade-Insecure-Requests': '1',
      Cookie: this.cookieStr(),
      ...extra,
    };
  }

  async get(path, headers = {}) {
    const res = await axios.get(`${BASE_URL}${path}`, {
      headers: this.baseHeaders(headers),
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 20000,
    });
    this.saveCookies(res.headers['set-cookie']);
    return res;
  }

  async post(path, body, headers = {}) {
    const res = await axios.post(`${BASE_URL}${path}`, body, {
      headers: this.baseHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer':      `${BASE_URL}/login`,
        'Origin':       BASE_URL,
        'Sec-Fetch-Mode': 'cors',
        ...headers,
      }),
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 30000,
    });
    this.saveCookies(res.headers['set-cookie']);
    return res;
  }

  async login() {
    console.log('🔐 Establishing stealth session...');

    await this.get('/');
    await sleep(rand(1200, 2800));

    const r1 = await this.get('/login');
    await sleep(rand(600, 1400));

    const $ = cheerio.load(r1.data);
    this.csrfToken = $('input[name="_token"]').first().val();
    if (!this.csrfToken) throw new Error('CSRF token not found');

    await sleep(rand(800, 2000));

    const params = new URLSearchParams({
      user_name: process.env.SHINCHUO_USER || 'nipponbid',
      password:  process.env.SHINCHUO_PASS || '123456',
      _token:    this.csrfToken,
      returnurl: '',
    });
    const r2 = await this.post('/login', params.toString());
    this.saveCookies(r2.headers['set-cookie']);

    await sleep(rand(500, 1200));
    const r3 = await this.get('/login');

    if (r3.data.includes('form#login_form') || (r3.data.length < 5000 && !r3.headers.location?.includes('clients'))) {
      throw new Error('Login failed — check SHINCHUO_USER / SHINCHUO_PASS');
    }

    await sleep(rand(800, 1500));
    const r4 = await this.get('/clients/main');
    const $4 = cheerio.load(r4.data);
    this.csrfToken = $4('input[name="_token"]').first().val() || this.csrfToken;

    if (!r4.data.includes('car-list-filters')) throw new Error('Could not reach client portal');
    console.log('✅ Session established\n');
  }

  async fetchPage(pageNo) {
    const params = new URLSearchParams({
      _token:     this.csrfToken,
      loadFilter: '',
      listby:     'grid',
      page_no:    String(pageNo),
    });

    const res = await this.post(SEARCH_URL.replace(BASE_URL, ''), params.toString(), {
      'Accept':           'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer':          `${BASE_URL}/clients/main`,
      'Sec-Fetch-Mode':   'cors',
      'Sec-Fetch-Dest':   'empty',
    });

    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (!json?.status) throw new Error('API returned status:false');

    return {
      cars:       parseCarCards(json.data.view || ''),
      totalCount: parseInt(json.data.totalCount, 10) || 0,
    };
  }

  async fetchDetail(detailUrl) {
    try {
      const path = detailUrl.replace(BASE_URL, '');
      const res  = await this.get(path, {
        'Referer':        `${BASE_URL}/clients/main`,
        'Sec-Fetch-Dest': 'document',
      });
      if (res.status !== 200) return {};

      const $ = cheerio.load(res.data);
      const sheetUrl = $('input#sheet_new').val() || null;

      const imgs = new Set();
      $('img[src*="ajes.com"]').each((_, el) => {
        const s = $(el).attr('src');
        if (s) imgs.add(s.split('&w=')[0]);
      });
      $('a[href*="ajes.com"]').each((_, el) => {
        const h = $(el).attr('href');
        if (h) imgs.add(h.split('&w=')[0]);
      });

      return { sheet_url: sheetUrl, extra_images: JSON.stringify([...imgs]) };
    } catch {
      return {};
    }
  }
}

function parseCarCards(html) {
  const $ = cheerio.load(html);
  const cars = [];

  $('div.info-wrap').each((_, el) => {
    const $el   = $(el);
    const $link = $el.closest('a');
    const pid   = $el.attr('data-pid');
    if (!pid) return;

    const title     = $link.attr('title') || '';
    const detailUrl = $link.attr('href') || null;
    const imgSrc    = $el.find('img').first().attr('src') || null;
    const dateBadge = $el.find('.img-wrap span').first().text().trim();

    const skipCls   = new Set(['info-wrap','uc-relative','productDetail']);
    const auctHouses = ($el.attr('class')||'').split(/\s+/).filter(c=>c&&!skipCls.has(c));

    const tbl = {};
    $el.find('table.grid-table-detail tr').each((_, row) => {
      const cells = $(row).find('td').map((_, td) => $(td).text().replace(/\s+/g,' ').trim()).get();
      for (let i = 0; i < cells.length - 1; i++) {
        const v = cells[i+1]?.replace(/^:\s*/,'').trim();
        if (v && v !== ':') tbl[cells[i].trim()] = v;
      }
    });

    const priceRaw  = $el.find('td.price strong').text().replace(/[^\d.]/g,'');
    const startPrice = priceRaw ? parseFloat(priceRaw) : null;

    const gradeRaw   = tbl['Grade'] || '';
    const gradeMatch = gradeRaw.match(/(\d+(?:\.\d+)?)\s*$/);
    const auctionGrade = gradeMatch ? gradeMatch[1] : null;

    const mileageRaw = tbl['Mileage'] || '';
    const mileage    = parseMileage(mileageRaw);

    const fullText = $el.text();
    const ccMatch  = fullText.match(/(\d[\d,]*)cc/);
    const cc       = ccMatch ? parseInt(ccMatch[1].replace(/,/g,''), 10) : null;

    const auctionDate = parseDate(dateBadge) || parseDate(tbl['Auction'] || '');

    cars.push({
      pid,
      make:          tbl['Make']    || title.split('-')[0]?.trim() || null,
      model:         tbl['Model']   || title.split('-').slice(1).join('-').trim() || null,
      year:          tbl['Year']    ? parseInt(tbl['Year'], 10) : null,
      auction_house: tbl['Auction'] || auctHouses.join(' ') || null,
      lot_number:    tbl['Lot#']    || null,
      chassis:       tbl['Chassis'] || null,
      mileage,
      cc,
      grade:         gradeRaw   || null,
      auction_grade: auctionGrade,
      auction_date:  auctionDate,
      start_price:   startPrice || null,
      image_url:     imgSrc ? imgSrc.split('&w=')[0] : null,
      detail_url:    detailUrl,
      sheet_url:     null,
      extra_images:  null,
    });
  });

  return cars;
}

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS japan_cars (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      pid           VARCHAR(50) NOT NULL UNIQUE,
      make          VARCHAR(100),
      model         VARCHAR(200),
      year          INT,
      auction_house VARCHAR(200),
      lot_number    VARCHAR(50),
      chassis       VARCHAR(100),
      mileage       INT,
      cc            INT,
      grade         VARCHAR(200),
      auction_grade VARCHAR(20),
      transmission  VARCHAR(20),
      color         VARCHAR(50),
      auction_date  DATE,
      status        ENUM('upcoming','past','purchased') DEFAULT 'upcoming',
      start_price   DECIMAL(14,2),
      image_url     VARCHAR(500),
      sheet_url     VARCHAR(500),
      detail_url    VARCHAR(500),
      extra_images  TEXT,
      scraped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_make         (make),
      INDEX idx_model        (model),
      INDEX idx_year         (year),
      INDEX idx_auction_date (auction_date),
      INDEX idx_status       (status)
    )
  `);

  try {
    await db.query(`ALTER TABLE japan_cars ADD COLUMN status ENUM('upcoming','past','purchased') DEFAULT 'upcoming' AFTER auction_date`);
  } catch {  }
}

async function upsertBatch(cars) {
  if (!cars.length) return;
  const cols = [
    'pid','make','model','year','auction_house','lot_number','chassis',
    'mileage','cc','grade','auction_grade','auction_date','start_price',
    'image_url','sheet_url','detail_url','extra_images',
  ];
  const ph      = cars.map(() => `(${cols.map(()=>'?').join(',')})`).join(',');
  const values  = cars.flatMap(c => cols.map(k => c[k] ?? null));
  const updates = cols.filter(c=>c!=='pid').map(c=>`${c}=VALUES(${c})`).join(',');

  await db.query(
    `INSERT INTO japan_cars (${cols.join(',')}) VALUES ${ph}
     ON DUPLICATE KEY UPDATE ${updates}, updated_at=NOW()`,
    values,
  );
}

async function cleanupPastCars() {
  const [res] = await db.query(
    `UPDATE japan_cars
     SET status = 'past'
     WHERE auction_date < CURDATE()
       AND status = 'upcoming'`,
  );
  if (res.affectedRows > 0) console.log(`🧹 Marked ${res.affectedRows} cars as past`);
}

async function run() {
  const args       = process.argv.slice(2);
  const pagesIdx   = args.indexOf('--pages');
  const maxPages   = pagesIdx !== -1 ? parseInt(args[pagesIdx+1],10) : Infinity;
  const noDetails  = args.includes('--no-details');
  const cleanupOnly = args.includes('--cleanup');

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  NipponBid Shinchuo Agent — ${new Date().toISOString().slice(0,10)}     ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  await ensureSchema();

  if (cleanupOnly) {
    await cleanupPastCars();
    console.log('✅ Cleanup done\n');
    return process.exit(0);
  }

  const session = new StealthSession();
  await session.login();

  const { cars: firstBatch, totalCount } = await session.fetchPage(1);
  const totalPages = Math.ceil(totalCount / 15);
  const toScrape   = Math.min(totalPages, maxPages);

  console.log(`📊 ${totalCount.toLocaleString()} cars across ${totalPages.toLocaleString()} pages`);
  console.log(`🎯 Scraping ${toScrape} pages (${noDetails ? 'listing data only' : 'with detail pages'})`);
  console.log(`🥷 Stealth mode: random delays ${MIN_DELAY}-${MAX_DELAY}ms\n`);

  let batch = [];
  let saved = 0;
  let errors = 0;

  const enrichAndQueue = async (car) => {
    if (!noDetails && car.detail_url) {
      const extra = await session.fetchDetail(car.detail_url);
      Object.assign(car, extra);
      await sleep(rand(400, 900));
    }
    // Keep original source URL — images are proxied via /api/image-proxy
    batch.push(car);
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch);
      saved += batch.length;
      batch  = [];
    }
  };

  for (const car of firstBatch) await enrichAndQueue(car);
  await jitter();

  const remainingPages = Array.from({ length: toScrape - 1 }, (_, i) => i + 2);

  for (let i = 0; i < remainingPages.length; i++) {
    const pageNo = remainingPages[i];
    const pageNum = i + 2;

    try {
      const { cars } = await session.fetchPage(pageNo);
      for (const car of cars) await enrichAndQueue(car);

      if (pageNum % 5 === 0 || pageNum === toScrape) {
        const pct = ((pageNum / toScrape) * 100).toFixed(1);
        console.log(`  ✓ Page ${pageNum}/${toScrape} (${pct}%) — ${saved + batch.length} saved`);
      }

      if (pageNum % PAUSE_EVERY === 0) {
        const pause = rand(LONG_PAUSE_MIN, LONG_PAUSE_MAX);
        console.log(`  ☕ Natural pause ${(pause/1000).toFixed(1)}s...`);
        await sleep(pause);
      } else {
        await jitter();
      }
    } catch (e) {
      errors++;
      console.warn(`  ⚠ Page ${pageNo} failed: ${e.message}`);
      await sleep(rand(3000, 6000));
    }
  }

  if (batch.length) { await upsertBatch(batch); saved += batch.length; }

  await cleanupPastCars();

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  ✅ Done  ${saved.toLocaleString()} saved  ${errors} errors   ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  process.exit(0);
}

run().catch(e => {
  console.error('💥 Agent crashed:', e.message);
  process.exit(1);
});
