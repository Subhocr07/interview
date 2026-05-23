import { Router } from 'express';
import { bookService } from '../services/bookService.js';

const router = Router();

// ── List all books (from MongoDB — paginated) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort } = req.query;
    const result = await bookService.list({ page: +page, limit: +limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get one book by ID (source of truth = MongoDB) ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const book = await bookService.getById(req.params.id);
    res.json(book);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ── Create a book ──────────────────────────────────────────────────────────
// Writes to MongoDB only. Change Stream → ES sync happens automatically.
router.post('/', async (req, res) => {
  try {
    const book = await bookService.create(req.body);
    res.status(201).json(book);
  } catch (err) {
    const isValidation = err.name === 'ValidationError';
    res.status(isValidation ? 400 : (err.status ?? 500)).json({ error: err.message });
  }
});

// ── Update a book ──────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const book = await bookService.update(req.params.id, req.body);
    res.json(book);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ── Delete a book ──────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await bookService.delete(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
