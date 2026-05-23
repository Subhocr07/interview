import { Router } from 'express';
import { searchRepo } from '../repositories/searchRepo.js';

const router = Router();

// ── Full-text search (reads from ES) ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { q, genre, minYear, maxYear, minRating, sort, page, size } = req.query;
    const result = await searchRepo.search({
      q, genre, minYear, maxYear, minRating, sort,
      page: page ? +page : 1,
      size: size ? +size : 10,
    });
    res.json(result);
  } catch (err) {
    console.error('Search error:', err.meta?.body?.error ?? err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Autocomplete (reads from ES) ───────────────────────────────────────────
router.get('/suggest', async (req, res) => {
  try {
    const suggestions = await searchRepo.suggest(req.query.q);
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
