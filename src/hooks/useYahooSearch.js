import { useState, useCallback, useRef } from 'react';
import api from '../services/api';

const DEFAULT_FILTERS = {
  source: 'all',
  condition: 'all',
  minPrice: '',
  maxPrice: '',
  make: '',
  sort: '',
  shipping: 'all',
  results: 20,
  start: 1,
};

export function useYahooSearch() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [meta,    setMeta]    = useState({ total: 0, page: 1, sources: null });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const search = useCallback(async (query, overrideFilters) => {
    if (!query?.trim()) return;
    const f = overrideFilters ?? filtersRef.current;
    setLoading(true);
    setError(null);
    try {
      const endpoint = f.source === 'auction'
        ? '/yahoo/search/auction'
        : f.source === 'shopping'
          ? '/yahoo/search/shopping'
          : '/yahoo/search';

      const params = {
        q:        query.trim(),
        results:  f.results || 20,
        start:    f.start   || 1,
        sort:     f.sort    || undefined,
        minPrice: f.minPrice || undefined,
        maxPrice: f.maxPrice || undefined,
        condition: (f.condition && f.condition !== 'all') ? f.condition : undefined,
        shipping:  f.shipping === 'free' ? 'free' : undefined,
      };

      const { data } = await api.get(endpoint, { params });
      setItems(data.results || []);
      setMeta({
        total:   data.total || 0,
        page:    data.page  || 1,
        sources: data.sources || null,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Search failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilter = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  }, []);

  const updateFilters = useCallback((obj) => {
    setFilters(prev => ({ ...prev, ...obj }));
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setMeta({ total: 0, page: 1, sources: null });
    setFilters(DEFAULT_FILTERS);
  }, []);

  return { items, loading, error, meta, filters, search, updateFilter, updateFilters, reset };
}
