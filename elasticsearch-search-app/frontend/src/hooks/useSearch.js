import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api';

export function useSearch() {
  const [query, setQuery]           = useState('');
  const [filters, setFilters]       = useState({ genre: '', minYear: '', maxYear: '', minRating: '' });
  const [sort, setSort]             = useState('relevance');
  const [page, setPage]             = useState(1);
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const debounceRef = useRef(null);
  const suggestRef  = useRef(null);
  const abortRef    = useRef(null);

  // ─── Main search ─────────────────────────────────────────────────────
  const doSearch = useCallback(async (q, f, s, p) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ...(q && { q }),
      ...(f.genre     && { genre: f.genre }),
      ...(f.minYear   && { minYear: f.minYear }),
      ...(f.maxYear   && { maxYear: f.maxYear }),
      ...(f.minRating && { minRating: f.minRating }),
      sort: s,
      page: p,
      size: 10,
    });

    try {
      const res = await fetch(`${API}/search?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce: run search 350ms after last change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, filters, sort, page);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, filters, sort, page, doSearch]);

  // Reset to page 1 whenever search params change
  useEffect(() => {
    setPage(1);
  }, [query, filters, sort]);

  // ─── Autocomplete ─────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(suggestRef.current);
    if (!query.trim() || query.length < 2) { setSuggestions([]); return; }

    suggestRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch { /* ignore */ }
    }, 200);

    return () => clearTimeout(suggestRef.current);
  }, [query]);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ genre: '', minYear: '', maxYear: '', minRating: '' });
    setQuery('');
    setSort('relevance');
  }

  return {
    query, setQuery,
    filters, updateFilter, clearFilters,
    sort, setSort,
    page, setPage,
    results, loading, error,
    suggestions, setSuggestions,
    showSuggest, setShowSuggest,
  };
}
