function Stars({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="stars" title={`${rating}/5`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
      <span className="rating-num"> {rating.toFixed(1)}</span>
    </span>
  );
}

// Render ES <mark>-highlighted HTML safely (titles/authors are plain text)
function Highlight({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ResultCard({ book, query }) {
  const titleHTML  = book.highlight?.title?.[0]  || book.title;
  const descHTML   = book.highlight?.description?.[0] || book.description;
  const authorHTML = book.highlight?.author?.[0] || book.author;

  return (
    <div className="result-card">
      <div className="card-top">
        <div className="card-meta-left">
          <h3 className="book-title">
            <Highlight html={titleHTML} />
          </h3>
          <div className="book-author">
            by <Highlight html={authorHTML} />
          </div>
        </div>
        <div className="card-meta-right">
          <span className="genre-tag">{book.genre}</span>
          <div className="book-year">{book.year}</div>
        </div>
      </div>

      <p className="book-desc">
        <Highlight html={descHTML} />
      </p>

      <div className="card-footer">
        <Stars rating={book.rating} />
        <span className="pages">{book.pages} pages</span>
        {book.score != null && (
          <span className="score" title="Relevance score">score {book.score.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
