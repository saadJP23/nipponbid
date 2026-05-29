const router = require('express').Router();
const { auth } = require('../middleware/auth');
const {
  searchAll, searchShopping, searchAuctions,
  getAuctionItem, getAuctionQA,
} = require('../services/yahooApi');
const { translateText, translateItems } = require('../services/translate');

function buildQuery(q, chassis) {
  if (!q) return null;
  return chassis ? `${chassis} ${q}` : q;
}

function parseOpts(query) {
  const {
    results = 20, start = 1, page = 1, sort,
    condition, minPrice, maxPrice, shipping, intl,
  } = query;
  return {
    results: Number(results),
    start:   Number(start),
    page:    Number(page),
    sort,
    condition: condition && condition !== 'all' ? condition : undefined,
    priceMin:  minPrice  || undefined,
    priceMax:  maxPrice  || undefined,
    shipping:  shipping  || (intl === 'true' ? 'intl' : undefined),
  };
}

router.get('/search', auth, async (req, res, next) => {
  try {
    const { q, chassis, translate: doTranslate } = req.query;
    const query = buildQuery(q, chassis);
    if (!query) return res.status(400).json({ message: 'q is required' });

    const opts = parseOpts(req.query);
    const result = await searchAll(query, opts);

    if (doTranslate === 'true') {
      result.hits = result.hits.map(item => ({ ...item, titleJa: item.title }));
      result.hits = await translateItems(result.hits).catch(() => result.hits);
    }

    res.json({
      type: 'all',
      total: result.total,
      results: result.hits,
      sources: result.sources,
      page: opts.page,
      results_per_page: opts.results,
    });
  } catch (err) { next(err); }
});

router.get('/search/shopping', auth, async (req, res, next) => {
  try {
    const { q, chassis, translate: doTranslate } = req.query;
    const query = buildQuery(q, chassis);
    if (!query) return res.status(400).json({ message: 'q is required' });

    const opts = parseOpts(req.query);
    const result = await searchShopping(query, opts);

    let hits = result.hits;
    if (doTranslate === 'true') {
      hits = hits.map(item => ({ ...item, titleJa: item.title }));
      hits = await translateItems(hits).catch(() => hits);
    }

    res.json({ type: 'shopping', total: result.total, results: hits, page: opts.page });
  } catch (err) { next(err); }
});

router.get('/search/auction', auth, async (req, res, next) => {
  try {
    const { q, chassis, translate: doTranslate } = req.query;
    const query = buildQuery(q, chassis);
    if (!query) return res.status(400).json({ message: 'q is required' });

    const opts = parseOpts(req.query);
    const result = await searchAuctions(query, {
      ...opts, min: opts.priceMin, max: opts.priceMax, freeShipping: opts.shipping === 'free',
    });

    let hits = result.hits;
    if (doTranslate === 'true') {
      hits = hits.map(item => ({ ...item, titleJa: item.title }));
      hits = await translateItems(hits).catch(() => hits);
    }

    res.json({ type: 'auction', total: result.total, results: hits, page: opts.page });
  } catch (err) { next(err); }
});

router.get('/auction/:id', auth, async (req, res, next) => {
  try {
    const data = await getAuctionItem(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/qa/:auctionId', auth, async (req, res, next) => {
  try {
    const data = await getAuctionQA(req.params.auctionId);
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/translate', auth, async (req, res, next) => {
  try {
    const { text, from = 'EN', to = 'JA' } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });
    const translated = await translateText(text, from, to);
    res.json({ translated, from, to });
  } catch (err) { next(err); }
});

router.get('/shopping/search', auth, async (req, res, next) => {
  req.url = '/search/shopping' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?') - 1) : '');
  next('route');
});

module.exports = router;
