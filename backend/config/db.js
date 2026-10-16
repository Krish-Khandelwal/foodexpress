import mongoose from 'mongoose';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/quickbite';

  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
  } catch (primaryErr) {
    console.warn(`Primary MongoDB Atlas connection failed (${primaryErr.message}).`);
    console.log(`Falling back to local MongoDB at 127.0.0.1:27017...`);
    try {
      const conn = await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 4000 });
      console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
    } catch (fallbackErr) {
      console.error(`MongoDB connection failed: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;