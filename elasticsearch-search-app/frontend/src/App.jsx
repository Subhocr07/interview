import { useEffect, useState } from 'react';
import { useSearch } from './hooks/useSearch';
import SearchBar from './components/SearchBar';
import Facets from './components/Facets';
import SearchResults from './components/SearchResults';

export default function App() {
  const {
    query, setQuery,
    filters, updateFilter, clearFilters,
    sort, setSort,
    page, setPage,
    results, loading, error,
    suggestions, setSuggestions,
    showSuggest, setShowSuggest,
  } = useSearch();

  const [health, setHealth] = useState(null);
  const [stats, setStats]   = useState(null);

  // Check ES health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setHealth(d.elasticsearch))
      .catch(() => setHealth('unreachable'));

    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  function handleSuggestSelect(title) {
    setQuery(title);
    setSuggestions([]);
  }

  const statusColor =
    health === 'green'       ? '#3fb950' :
    health === 'yellow'      ? '#e3b341' :
    health === 'unreachable' ? '#f85149' : '#555';

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">⚡</span>
            <div>
              <div className="brand-name">Book Search</div>
              <div className="brand-sub">Powered by Elasticsearch</div>
            </div>
          </div>
          <div className="header-meta">
            {stats && (
              <span className="stats-badge">{stats.docs} books indexed</span>
            )}
            <span className="health-badge" style={{ color: statusColor }}>
              ● ES {health || 'connecting...'}
            </span>
          </div>
        </div>

        <SearchBar
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          suggestions={suggestions}
          showSuggest={showSuggest}
          setShowSuggest={setShowSuggest}
          onSuggestSelect={handleSuggestSelect}
        />
      </header>

      {/* Main layout */}
      <main className="main">
        <Facets
          aggregations={results?.aggregations}
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          total={results?.total}
        />
        <section className="results-section">
          <SearchResults
            results={results}
            loading={loading}
            error={error}
            query={query}
            page={page}
            setPage={setPage}
          />
        </section>
      </main>
    </div>
  );
}
