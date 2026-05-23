import { useRef, useEffect } from 'react';

export default function SearchBar({ query, setQuery, sort, setSort, suggestions, showSuggest, setShowSuggest, onSuggestSelect }) {
  const inputRef    = useRef(null);
  const containerRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [setShowSuggest]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setShowSuggest(false); inputRef.current.blur(); }
  }

  return (
    <div className="search-bar-area">
      <div className="search-row">
        <div className="search-input-wrap" ref={containerRef}>
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search books by title, author, or description..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSuggest(true); }}
            onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button className="clear-btn" onClick={() => { setQuery(''); setSuggestions([]); inputRef.current.focus(); }}>
              ✕
            </button>
          )}
          {showSuggest && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map(s => (
                <div
                  key={s.id}
                  className="suggestion-item"
                  onMouseDown={() => { onSuggestSelect(s.title); setShowSuggest(false); }}
                >
                  <span className="suggest-icon">📖</span>
                  <div>
                    <div className="suggest-title">{s.title}</div>
                    <div className="suggest-meta">{s.author} · <span className="genre-chip">{s.genre}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <select
          className="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="rating_desc">Rating ↓</option>
          <option value="rating_asc">Rating ↑</option>
          <option value="year_desc">Newest First</option>
          <option value="year_asc">Oldest First</option>
          <option value="title_asc">Title A→Z</option>
        </select>
      </div>
    </div>
  );
}
