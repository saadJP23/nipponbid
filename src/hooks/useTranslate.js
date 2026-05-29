import { useState, useCallback } from 'react';
import api from '../services/api';

export function useTranslate() {
  const [translating, setTranslating] = useState(false);
  const [error,       setError]       = useState(null);

  const translate = useCallback(async (text, fromOrOpts = 'EN', toArg = 'JA') => {
    const from = (fromOrOpts && typeof fromOrOpts === 'object') ? (fromOrOpts.from || 'EN') : fromOrOpts;
    const to   = (fromOrOpts && typeof fromOrOpts === 'object') ? (fromOrOpts.to   || 'JA') : toArg;
    if (!text) return text;
    setTranslating(true);
    setError(null);
    try {
      const { data } = await api.post('/yahoo/translate', { text, from, to });
      return data.translated;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Translation failed';
      setError(msg);
      return null;
    } finally {
      setTranslating(false);
    }
  }, []);

  return { translate, translating, loading: translating, error };
}
