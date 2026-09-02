import { createRequire } from 'module';
import path from 'path';

export async function connectDB(uri, customMongoose) {
  let mongooseInstance = customMongoose;
  if (!mongooseInstance) {
    const req = createRequire(path.join(process.cwd(), 'package.json'));
    mongooseInstance = req('mongoose');
  }

  mongooseInstance.set('strictQuery', true);

  try {
    await mongooseInstance.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
    });

    mongooseInstance.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongooseInstance.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Reconnecting...');
    });
  } catch (error) {
    if (error.message?.includes('bad auth') || error.message?.includes('Authentication failed')) {
      throw new Error(
        'MongoDB authentication failed. Check MONGO_URI username/password in this service .env (Atlas Database Access).'
      );
    }
    throw error;
  }

  return mongooseInstance.connection;
}
