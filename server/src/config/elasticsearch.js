const { Client } = require('@elastic/elasticsearch');

const es = new Client({
  node: process.env.ES_URL || 'http://localhost:9200',
});

const CAR_INDEX = 'cars';

const createIndex = async () => {
  try {
    const exists = await es.indices.exists({ index: CAR_INDEX });
    if (exists) return;

    await es.indices.create({
      index: CAR_INDEX,
      mappings: {
        properties: {
          car_id:        { type: 'integer' },
          make:          { type: 'text', fields: { keyword: { type: 'keyword' } } },
          model:         { type: 'text', fields: { keyword: { type: 'keyword' } } },
          year:          { type: 'integer' },
          chassis_no:    { type: 'keyword' },
          color:         { type: 'keyword' },
          mileage:       { type: 'integer' },
          grade:         { type: 'keyword' },
          engine:        { type: 'keyword' },
          transmission:  { type: 'keyword' },
          fuel_type:     { type: 'keyword' },
          status:        { type: 'keyword' },
          starting_price:{ type: 'float' },
          auction_id:    { type: 'integer' },
          auction_name:  { type: 'text' },
          auction_date:  { type: 'date' },
          primary_image: { type: 'keyword', index: false },
        },
      },
    });
    console.log(`Elasticsearch index "${CAR_INDEX}" created`);
  } catch (err) {
    console.warn('Elasticsearch unavailable — search falls back to MySQL:', err.message);
  }
};

const indexCar = async (car) => {
  try {
    await es.index({ index: CAR_INDEX, id: String(car.car_id), document: car });
  } catch {}
};

const deleteCar = async (carId) => {
  try {
    await es.delete({ index: CAR_INDEX, id: String(carId) });
  } catch {}
};

const searchCars = async ({ search, make, model, year_min, year_max, status, auction_id, page = 1, limit = 20 }) => {
  const must = [];
  const filter = [];

  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: ['make^2', 'model^2', 'chassis_no^3', 'auction_name', 'color', 'engine'],
        fuzziness: 'AUTO',   // tolerates typos
      },
    });
  }

  if (make)       filter.push({ match: { make } });
  if (model)      filter.push({ match: { model } });
  if (status)     filter.push({ term: { status } });
  if (auction_id) filter.push({ term: { auction_id: Number(auction_id) } });
  if (year_min || year_max) {
    filter.push({ range: { year: { gte: year_min || 1900, lte: year_max || 2100 } } });
  }

  try {
    const result = await es.search({
      index: CAR_INDEX,
      from: (page - 1) * limit,
      size: limit,
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort: [{ auction_date: { order: 'asc' } }, '_score'],
    });

    const hits = result.hits.hits.map(h => h._source);
    const total = result.hits.total.value;
    return { cars: hits, total, page: Number(page), pages: Math.ceil(total / limit), source: 'elasticsearch' };
  } catch (err) {
    console.warn('ES search failed:', err.message);
    return null; // caller falls back to MySQL
  }
};

module.exports = { es, createIndex, indexCar, deleteCar, searchCars, CAR_INDEX };
