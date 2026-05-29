

require('dotenv').config();
const axios  = require('axios');
const cheerio = require('cheerio');
const db     = require('../config/database');

const BASE_URL    = 'https://shinchuo.jp';
const LOGIN_URL   = `${BASE_URL}/login`;
const SEARCH_URL  = `${BASE_URL}/clients/car-list-filters`;
const DETAIL_BASE = `${BASE_URL}/clients/product-detail`;
const CREDS       = {
  user_name: process.env.SHINCHUO_USER || 'nipponbid',
  password:  process.env.SHINCHUO_PASS || '123456',
};
const DELAY_MS    = 1200;
const BATCH_SIZE  = 50;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseMileage(str) {
  if (!str) return null;
  const m = str.replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function parseCC(str) {
  if (!str) return null;
  const m = str.replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function parseYear(str) {
  if (!str) return null;
  const m = str.match(/\d{4}/);
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

function extractField(texts, label) {
  const idx = texts.indexOf(label);
  if (idx === -1) return null;
  return texts[idx + 2] || texts[idx + 1] || null;
}

class ShinchuoSession {
  constructor() {
    this.cookies = {};
    this.csrfToken = null;
    this.client = axios.create({
      baseURL: BASE_URL,
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  }

  saveCookies(setCookieHeader) {
    if (!setCookieHeader) return;
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const h of headers) {
      const [kv] = h.split(';');
      const [k, v] = kv.split('=');
      if (k && v !== undefined) this.cookies[k.trim()] = v.trim();
    }
  }

  cookieString() {
    return Object.entries(this.cookies).map(([k,v]) => `${k}=${v}`).join('; ');
  }

  async get(url, opts = {}) {
    const res = await this.client.get(url, {
      ...opts,
      headers: { ...opts.headers, Cookie: this.cookieString() },
    });
    this.saveCookies(res.headers['set-cookie']);
    return res;
  }

  async post(url, data, opts = {}) {
    const res = await this.client.post(url, data, {
      ...opts,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE_URL}/login`,
        Cookie: this.cookieString(),
        ...opts.headers,
      },
    });
    this.saveCookies(res.headers['set-cookie']);
    return res;
  }

  async login() {
    console.log('🔐 Logging in to shinchuo.jp...');

    const r1 = await this.get('/login');
    const $ = cheerio.load(r1.data);
    this.csrfToken = $('input[name="_token"]').first().val();
    if (!this.csrfToken) throw new Error('Could not extract CSRF token');

    const params = new URLSearchParams({
      user_name:   CREDS.user_name,
      password:    CREDS.password,
      _token:      this.csrfToken,
      returnurl:   '',
    });
    const r2 = await this.post('/login', params.toString());
    this.saveCookies(r2.headers['set-cookie']);

    const r3 = await this.get('/login');
    const finalUrl = r3.request?.path || r3.headers?.location || '';

    const $3 = cheerio.load(r3.data);
    const hasLoginForm = $3('form#login_form').length > 0 || $3('input[name="password"]').length > 0;
    if (hasLoginForm && !r3.data.includes('clients/main')) {
      const r4 = await this.get('/clients/main');
      const $4 = cheerio.load(r4.data);
      const isMain = r4.data.includes('car-filter-form') || r4.data.includes('car-list-filters');
      if (!isMain) throw new Error('Login failed — check SHINCHUO_USER/SHINCHUO_PASS in .env');
      this.csrfToken = $4('input[name="_token"]').first().val() || this.csrfToken;
    } else {
      this.csrfToken = $3('input[name="_token"]').first().val() || this.csrfToken;
      const r4 = await this.get('/clients/main');
      const $4 = cheerio.load(r4.data);
      this.csrfToken = $4('input[name="_token"]').first().val() || this.csrfToken;
    }

    console.log('✅ Logged in successfully');
  }

  
  async fetchPage(pageNo) {
    const params = new URLSearchParams({
      _token:    this.csrfToken,
      loadFilter: '',
      listby:    'grid',
      page_no:   String(pageNo),
    });

    const res = await this.post(SEARCH_URL, params.toString(), {
      headers: {
        'Accept':           'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer':          `${BASE_URL}/clients/main`,
      },
    });

    if (res.status !== 200) throw new Error(`Search returned ${res.status}`);
    const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (!json.status) throw new Error('Search API returned status:false');

    const { view, totalCount } = json.data;
    const cars = this.parseCarCards(view);
    return { cars, totalCount: parseInt(totalCount, 10) };
  }

  
  parseCarCards(html) {
    const $ = cheerio.load(html);
    const cars = [];

    $('div.info-wrap').each((_, el) => {
      const $el  = $(el);
      const $link = $el.closest('a');

      const pid        = $el.attr('data-pid') || null;
      if (!pid) return;

      const title      = $link.attr('title') || '';
      const detailUrl  = $link.attr('href') || '';
      const imgSrc     = $el.find('img').first().attr('src') || null;

      const classes    = ($el.attr('class') || '').split(/\s+/);
      const skipClass  = new Set(['info-wrap','uc-relative','productDetail']);
      const auctionHouseClasses = classes.filter(c => c && !skipClass.has(c));

      const dateBadge  = $el.find('.img-wrap span').first().text().trim();

      const texts = [];
      $el.find('table.grid-table-detail tr').each((_, row) => {
        $(row).find('td').each((__, td) => {
          const t = $(td).text().replace(/\s+/g, ' ').trim();
          if (t && t !== ':') texts.push(t);
        });
      });

      const field = (label) => {
        const idx = texts.findIndex(t => t.trim() === label);
        if (idx === -1) return null;
        for (let i = idx + 1; i < texts.length && i < idx + 3; i++) {
          const v = texts[i].replace(/^:\s*/, '').trim();
          if (v && v !== ':') return v;
        }
        return null;
      };

      const priceText = $el.find('td.price strong').text().replace(/[^\d.]/g, '');
      const startPrice = priceText ? parseFloat(priceText) : null;

      const gradeRaw   = field('Grade') || '';
      const gradeMatch = gradeRaw.match(/(\d+(?:\.\d+)?)\s*$/);
      const auctionGrade = gradeMatch ? gradeMatch[1] : null;

      const mileageRaw = field('Mileage') || '';
      const ccText     = $el.find('table').text().match(/(\d[\d,]*)cc/)?.[1]?.replace(/,/g,'') || null;

      cars.push({
        pid,
        make:         field('Make') || title.split('-')[0]?.trim() || null,
        model:        field('Model') || title.split('-').slice(1).join('-').trim() || null,
        year:         parseYear(field('Year')),
        auction_house: field('Auction') || auctionHouseClasses.join(' ') || null,
        lot_number:   field('Lot#') || null,
        chassis:      field('Chassis') || null,
        mileage:      parseMileage(mileageRaw),
        cc:           ccText ? parseInt(ccText, 10) : null,
        grade:        gradeRaw || null,
        auction_grade: auctionGrade,
        auction_date: parseDate(dateBadge),
        start_price:  startPrice || null,
        image_url:    imgSrc ? imgSrc.split('&w=')[0] : null,
        detail_url:   detailUrl || null,
        sheet_url:    null,
        extra_images: null,
      });
    });

    return cars;
  }

  
  async fetchDetail(detailUrl) {
    try {
      const res = await this.get(detailUrl);
      if (res.status !== 200) return {};

      const $ = cheerio.load(res.data);
      const sheetUrl = $('input#sheet_new').val() || null;

      const imgs = [];
      $('img[src*="ajes.com"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) imgs.push(src.split('&w=')[0]);
      });
      $('a[href*="ajes.com"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) imgs.push(href.split('&w=')[0]);
      });
      const uniqueImgs = [...new Set(imgs)];

      return { sheet_url: sheetUrl, extra_images: JSON.stringify(uniqueImgs) };
    } catch (e) {
      console.warn(`  ⚠ Detail fetch failed for ${detailUrl}: ${e.message}`);
      return {};
    }
  }
}

async function ensureTable() {
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
      start_price   DECIMAL(14,2),
      image_url     VARCHAR(500),
      sheet_url     VARCHAR(500),
      detail_url    VARCHAR(500),
      extra_images  TEXT,
      scraped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_make (make),
      INDEX idx_model (model),
      INDEX idx_year (year),
      INDEX idx_auction_date (auction_date)
    )
  `);
}

async function upsertBatch(cars) {
  if (!cars.length) return;
  const cols = [
    'pid','make','model','year','auction_house','lot_number','chassis',
    'mileage','cc','grade','auction_grade','auction_date','start_price',
    'image_url','sheet_url','detail_url','extra_images',
  ];
  const placeholders = cars.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
  const values = cars.flatMap(c => cols.map(k => c[k] ?? null));
  const updateCols = cols.filter(c => c !== 'pid')
    .map(c => `${c}=VALUES(${c})`).join(',');

  await db.query(
    `INSERT INTO japan_cars (${cols.join(',')}) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE ${updateCols}, updated_at=NOW()`,
    values,
  );
}

async function main() {
  const args       = process.argv.slice(2);
  const maxPagesIdx = args.indexOf('--pages');
  const maxPages   = maxPagesIdx !== -1 ? parseInt(args[maxPagesIdx + 1], 10) : Infinity;
  const fetchDetails = !args.includes('--no-details');

  console.log(`\n🚗 NipponBid ↔ Shinchuo Scraper`);
  console.log(`   Fetch details: ${fetchDetails}`);
  console.log(`   Max pages: ${maxPages === Infinity ? 'all' : maxPages}\n`);

  await ensureTable();

  const session = new ShinchuoSession();
  await session.login();

  const { cars: firstPage, totalCount } = await session.fetchPage(1);
  const totalPages = Math.ceil(totalCount / 15);
  const pagesToScrape = Math.min(totalPages, maxPages);

  console.log(`📊 Total cars: ${totalCount.toLocaleString()}`);
  console.log(`📄 Total pages: ${totalPages.toLocaleString()}`);
  console.log(`🔄 Scraping ${pagesToScrape} pages...\n`);

  let batch = [];
  let totalScraped = 0;
  let page = 1;

  const processPage = async (cars) => {
    if (fetchDetails) {
      for (const car of cars) {
        if (car.detail_url) {
          const extra = await session.fetchDetail(car.detail_url);
          Object.assign(car, extra);
          await sleep(500);
        }
      }
    }
    batch.push(...cars);
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch);
      totalScraped += batch.length;
      batch = [];
    }
  };

  await processPage(firstPage);
  await sleep(DELAY_MS);

  for (page = 2; page <= pagesToScrape; page++) {
    try {
      const { cars } = await session.fetchPage(page);
      await processPage(cars);
      if (page % 10 === 0 || page === pagesToScrape) {
        const pct = ((page / pagesToScrape) * 100).toFixed(1);
        console.log(`  ✓ Page ${page}/${pagesToScrape} (${pct}%) — ${totalScraped + batch.length} saved`);
      }
    } catch (e) {
      console.warn(`  ⚠ Page ${page} failed: ${e.message} — skipping`);
    }
    await sleep(DELAY_MS);
  }

  if (batch.length) {
    await upsertBatch(batch);
    totalScraped += batch.length;
  }

  console.log(`\n✅ Done! ${totalScraped.toLocaleString()} cars saved to japan_cars\n`);
  process.exit(0);
}

main().catch(e => {
  console.error('💥 Scraper crashed:', e);
  process.exit(1);
});
