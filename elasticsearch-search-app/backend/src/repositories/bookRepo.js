import { Book } from '../models/Book.js';

// Pure data access — no business logic here.
// All methods return plain objects (.lean()) so callers don't depend on Mongoose docs.

export const bookRepo = {
  async create(data) {
    const doc = await new Book(data).save();
    return doc.toObject();
  },

  async findById(id) {
    return Book.findById(id).lean();
  },

  async update(id, data) {
    return Book.findByIdAndUpdate(id, { $set: data }, {
      new: true, runValidators: true,
    }).lean();
  },

  async delete(id) {
    return Book.findByIdAndDelete(id).lean();
  },

  async list({ page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Book.find().sort(sort).skip(skip).limit(limit).lean(),
      Book.countDocuments(),
    ]);
    return { docs, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async bulkInsert(docs) {
    // ordered: false — don't stop on a single duplicate; continue bulk
    return Book.insertMany(docs, { ordered: false });
  },

  async deleteAll() {
    return Book.deleteMany({});
  },

  // Returns a cursor for streaming all documents (used by reindex script)
  cursor() {
    return Book.find().lean().cursor();
  },
};
