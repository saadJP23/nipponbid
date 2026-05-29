const axios = require('axios');

const DEEPL_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

async function translateText(text, from = 'EN', to = 'JA') {
  if (!text) return text;
  if (!DEEPL_KEY) throw new Error('DEEPL_API_KEY not configured');

  const { data } = await axios.post(
    DEEPL_URL,
    new URLSearchParams({ auth_key: DEEPL_KEY, text, source_lang: from.toUpperCase(), target_lang: to.toUpperCase() }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return data.translations[0].text;
}

async function translateItems(items) {
  if (!items?.length) return items;

  const texts = [];
  items.forEach(item => {
    if (item.titleJa) texts.push({ idx: texts.length, field: 'titleEn', text: item.titleJa });
    if (item.descJa)  texts.push({ idx: texts.length, field: 'descEn',  text: item.descJa });
  });

  if (!texts.length) return items;

  const translated = await Promise.allSettled(
    texts.map(t => translateText(t.text, 'JA', 'EN').then(r => ({ ...t, result: r }))),
  );

  const map = {};
  translated.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const { field, result } = r.value;
      if (!map[i]) map[i] = {};
      map[i] = { field, result };
    }
  });

  return items.map(item => {
    const updates = {};
    texts.forEach((t, i) => {
      if (map[i] && (item.titleJa === t.text || item.descJa === t.text)) {
        updates[t.field] = map[i].result;
      }
    });
    return { ...item, ...updates };
  });
}

module.exports = { translateText, translateItems, translate: translateText };
