import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
  } catch (error) {
    process.exit(1);
  }
};

export default connectDB;

