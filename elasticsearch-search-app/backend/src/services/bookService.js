import { bookRepo } from '../repositories/bookRepo.js';

// Business logic layer — validation, transformation, orchestration.
// Does NOT talk to Elasticsearch directly; the Change Stream handles that.

export const bookService = {
  async create(data) {
    const book = await bookRepo.create(data);
    // ↑ Change stream fires "insert" → syncService indexes to ES automatically
    return book;
  },

  async getById(id) {
    const book = await bookRepo.findById(id);
    if (!book) throw Object.assign(new Error('Book not found'), { status: 404 });
    return book;
  },

  async update(id, data) {
    // Strip fields callers shouldn't be able to overwrite
    const { _id, __v, createdAt, ...safe } = data;
    const book = await bookRepo.update(id, safe);
    if (!book) throw Object.assign(new Error('Book not found'), { status: 404 });
    // ↑ Change stream fires "update" → syncService re-indexes to ES automatically
    return book;
  },

  async delete(id) {
    const book = await bookRepo.delete(id);
    if (!book) throw Object.assign(new Error('Book not found'), { status: 404 });
    // ↑ Change stream fires "delete" → syncService removes from ES automatically
    return book;
  },

  async list(opts) {
    return bookRepo.list(opts);
  },
};
