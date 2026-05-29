const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const APP_ID        = process.env.YAHOO_CLIENT_ID;
const SHOPPING_BASE = 'https://shopping.yahooapis.jp/ShoppingWebService/V3';
const AUCTION_BASE  = 'https://auctions.yahooapis.jp/AuctionWebService/V2';

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });

function normalizeShoppingItem(item) {
  return {
    id:           item.code,
    type:         'shopping',
    title:        item.name,
    price:        item.price,
    image:        item.image?.medium || item.image?.small || null,
    url:          item.url,
    seller:       item.seller?.name || null,
    rating:       item.review?.rate  || null,
    reviewCount:  item.review?.count || null,
    condition:    item.condition || 'new',
    freeShipping: item.shipping?.code === 2,
    inStock:      item.inStock ?? true,
    endTime:      null,
    bids:         null,
    description:  item.description || null,
  };
}

function normalizeAuctionItem(item) {
  return {
    id:           item.AuctionID,
    type:         'auction',
    title:        item.Title,
    price:        Number(item.Price || item.CurrentPrice) || null,
    image:        item.Image || item.Img || null,
    url:          item.AuctionItemUrl || null,
    seller:       item.Seller || null,
    rating:       null,
    reviewCount:  null,
    condition:    item.NewFlag === '1' ? 'unused' : 'used',
    freeShipping: item.Shipping?.Method === '送料無料',
    endTime:      item.EndTime || null,
    bids:         Number(item.Bids || item.BidCount) || 0,
    description:  item.Description || null,
  };
}

async function searchShopping(query, {
  results = 20, start = 1, sort = '-score',
  priceFrom, priceTo, condition, shipping,
} = {}) {
  const params = {
    appid: APP_ID, query, results,
    start: Number(start),
    sort,
    image_size: 300,
  };
  if (priceFrom)  params.price_from = priceFrom;
  if (priceTo)    params.price_to   = priceTo;
  if (condition && condition !== 'all') params.condition = condition;
  if (shipping === 'free') params['shipping.cost'] = 0;
  if (shipping === 'intl') params.shipping = 'international';

  const { data } = await axios.get(`${SHOPPING_BASE}/itemSearch`, { params });
  return {
    total:   data.totalResultsAvailable || 0,
    hits:    (data.hits || []).map(normalizeShoppingItem),
    rawPage: { start: data.firstResultsPosition || 1, results },
  };
}

async function searchAuctions(query, {
  results = 20, page = 1, sort = 'bids', order = 'desc',
  min, max, freeShipping, isNew,
} = {}) {
  const params = {
    appid: APP_ID, query, output: 'json',
    results, page, sort, order,
  };
  if (min)          params.min         = min;
  if (max)          params.max         = max;
  if (freeShipping) params.freeShipping = 1;
  if (isNew)        params.new          = 1;

  try {
    const { data } = await axios.get(`${AUCTION_BASE}/search`, { params });
    const raw = data.ResultSet?.Result?.Item || [];
    const items = Array.isArray(raw) ? raw : [raw];
    return {
      total: Number(data.ResultSet?.['@attributes']?.totalResultsAvailable || data.ResultSet?.totalResultsAvailable) || 0,
      hits:  items.filter(Boolean).map(normalizeAuctionItem),
    };
  } catch (err) {
    if (err.response?.status === 403) {
      const error = new Error('Yahoo Auction API requires separate registration');
      error.code = 'AUCTION_FORBIDDEN';
      throw error;
    }
    throw err;
  }
}

async function searchAll(query, opts = {}) {
  const shoppingOpts = {
    results:   opts.results || 20,
    start:     opts.start   || 1,
    sort:      opts.sort,
    priceFrom: opts.priceMin || opts.priceFrom,
    priceTo:   opts.priceMax || opts.priceTo,
    condition: opts.condition,
    shipping:  opts.shipping,
  };
  const auctionOpts = {
    results:     opts.results || 20,
    page:        opts.page    || 1,
    sort:        opts.sort,
    min:         opts.priceMin || opts.min,
    max:         opts.priceMax || opts.max,
    freeShipping: opts.shipping === 'free',
    isNew:        opts.condition === 'new',
  };

  const [shopResult, aucResult] = await Promise.allSettled([
    searchShopping(query, shoppingOpts),
    searchAuctions(query, auctionOpts),
  ]);

  const shopItems = shopResult.status === 'fulfilled' ? shopResult.value.hits : [];
  const aucItems  = aucResult.status  === 'fulfilled' ? aucResult.value.hits  : [];

  const results = [];
  const len = Math.max(shopItems.length, aucItems.length);
  for (let i = 0; i < len; i++) {
    if (shopItems[i]) results.push(shopItems[i]);
    if (aucItems[i])  results.push(aucItems[i]);
  }

  return {
    total:   (shopResult.status === 'fulfilled' ? shopResult.value.total : 0)
           + (aucResult.status  === 'fulfilled' ? aucResult.value.total  : 0),
    hits:    results,
    sources: {
      shopping: shopResult.status === 'fulfilled' ? 'ok' : shopResult.reason?.message,
      auctions: aucResult.status  === 'fulfilled' ? 'ok' : aucResult.reason?.message,
    },
  };
}

async function getAuctionItem(auctionID) {
  const { data } = await axios.get(`${AUCTION_BASE}/auctionItem`, {
    params: { appid: APP_ID, auctionID, output: 'json' },
  });
  return data;
}

async function getAuctionQA(auctionID) {
  try {
    const { data } = await axios.get(`${AUCTION_BASE}/getQandA`, {
      params: { appid: APP_ID, auctionID, output: 'json' },
    });
    return data;
  } catch {
    return { qa: [] };
  }
}

module.exports = {
  searchShopping, searchAuctions, searchAll,
  getAuctionItem, getAuctionQA,
  normalizeShoppingItem, normalizeAuctionItem,
};
