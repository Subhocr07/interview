import ResultCard from './ResultCard';
import Pagination from './Pagination';

export default function SearchResults({ results, loading, error, query, page, setPage }) {
  if (error) {
    return (
      <div className="state-box error-box">
        <div className="state-icon">⚠</div>
        <div className="state-title">Search error</div>
        <div className="state-msg">{error}</div>
        <div className="state-hint">Is Elasticsearch running? Check <code>docker compose ps</code></div>
      </div>
    );
  }

  if (loading && !results) {
    return (
      <div className="results-list">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line wide" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line narrow" />
            <div className="skeleton-line wide" />
          </div>
        ))}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="state-box">
        <div className="state-icon">🔍</div>
        <div className="state-title">Search for books</div>
        <div className="state-msg">Try "dystopia", "Andy Weir", or "mystery detective"</div>
      </div>
    );
  }

  if (results.total === 0) {
    return (
      <div className="state-box">
        <div className="state-icon">📭</div>
        <div className="state-title">No results found</div>
        <div className="state-msg">Try different keywords or remove some filters</div>
      </div>
    );
  }

  return (
    <div className={`results-area ${loading ? 'loading-overlay' : ''}`}>
      <div className="results-list">
        {results.hits.map(book => (
          <ResultCard key={book.id} book={book} query={query} />
        ))}
      </div>
      <Pagination
        page={page}
        size={results.size}
        total={results.total}
        onPageChange={setPage}
      />
    </div>
  );
}
