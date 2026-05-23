import mongoose from 'mongoose';
import 'dotenv/config';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/booksdb?replicaSet=rs0';

export async function connectMongoDB() {
  mongoose.set('strictQuery', true);

  // Retry loop — wait for replica set to be ready
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
      const { host, name } = mongoose.connection;
      console.log(`✅ MongoDB connected: ${host}/${name}`);

      mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
      mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));

      return;
    } catch (err) {
      console.log(`⏳ MongoDB not ready (attempt ${attempt}/10): ${err.message}`);
      if (attempt === 10) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

export { mongoose };
