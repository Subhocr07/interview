import mongoose from 'mongoose';

const GENRES = ['Fiction', 'Science Fiction', 'Mystery', 'Thriller', 'Fantasy',
                'Non-Fiction', 'Biography', 'Self-Help', 'History', 'Romance'];

const bookSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    author:      { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    genre:       { type: String, required: true, enum: GENRES },
    year:        { type: Number, required: true, min: 0, max: new Date().getFullYear() + 1 },
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    pages:       { type: Number, default: 0, min: 0 },
    isbn:        { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Indexes for common query patterns on Mongo side
bookSchema.index({ genre: 1 });
bookSchema.index({ year: 1 });
bookSchema.index({ rating: -1 });
bookSchema.index({ createdAt: -1 });

export const Book = mongoose.model('Book', bookSchema);
export { GENRES };
