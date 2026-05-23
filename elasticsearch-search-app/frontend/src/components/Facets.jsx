export default function Facets({ aggregations, filters, updateFilter, clearFilters, total }) {
  if (!aggregations) return null;

  const genres     = aggregations.genres?.buckets || [];
  const minYearVal = Math.floor(aggregations.min_year?.value ?? 1800);
  const maxYearVal = Math.ceil(aggregations.max_year?.value ?? 2024);
  const avgRating  = aggregations.avg_rating?.value?.toFixed(1);

  const activeCount = [filters.genre, filters.minYear, filters.maxYear, filters.minRating]
    .filter(Boolean).length;

  return (
    <aside className="facets">
      <div className="facet-header">
        <span>Filters</span>
        {activeCount > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Genre facet */}
      <div className="facet-section">
        <div className="facet-title">Genre</div>
        <div className="genre-list">
          {genres.map(b => (
            <button
              key={b.key}
              className={`genre-btn ${filters.genre === b.key ? 'active' : ''}`}
              onClick={() => updateFilter('genre', filters.genre === b.key ? '' : b.key)}
            >
              {b.key}
              <span className="facet-count">{b.doc_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Year range facet */}
      <div className="facet-section">
        <div className="facet-title">Year Range</div>
        <div className="year-inputs">
          <input
            type="number"
            className="year-input"
            placeholder={String(minYearVal)}
            value={filters.minYear}
            onChange={e => updateFilter('minYear', e.target.value)}
            min={minYearVal}
            max={maxYearVal}
          />
          <span className="year-dash">–</span>
          <input
            type="number"
            className="year-input"
            placeholder={String(maxYearVal)}
            value={filters.maxYear}
            onChange={e => updateFilter('maxYear', e.target.value)}
            min={minYearVal}
            max={maxYearVal}
          />
        </div>
        <div className="year-presets">
          {[
            { label: 'Classic (pre-1970)', min: '', max: '1969' },
            { label: '1970s–1990s',        min: '1970', max: '1999' },
            { label: 'Modern (2000+)',      min: '2000', max: '' },
          ].map(p => (
            <button
              key={p.label}
              className="preset-btn"
              onClick={() => { updateFilter('minYear', p.min); updateFilter('maxYear', p.max); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating facet */}
      <div className="facet-section">
        <div className="facet-title">Minimum Rating {avgRating && <span className="avg-rating">avg {avgRating}★</span>}</div>
        <div className="rating-btns">
          {[
            { label: 'Any', value: '' },
            { label: '3★+', value: '3' },
            { label: '3.5★+', value: '3.5' },
            { label: '4★+', value: '4' },
            { label: '4.5★+', value: '4.5' },
          ].map(r => (
            <button
              key={r.label}
              className={`rating-btn ${filters.minRating === r.value ? 'active' : ''}`}
              onClick={() => updateFilter('minRating', r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {total !== undefined && (
        <div className="result-total">{total.toLocaleString()} book{total !== 1 ? 's' : ''} found</div>
      )}
    </aside>
  );
}
