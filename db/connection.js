import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Brand from '../model/brandModel.js';
import Category from '../model/categoryModel.js';

dotenv.config();

const defaultCategories = [
  "Biscuits & Bakery",
  "Chips & Snacks",
  "Namkeen & Sweets",
  "Chocolates & Candies",
  "Beverages",
  "Tea & Coffee",
  "Personal Care",
  "Home Care",
  "Baby Care",
  "Grocery & Food"
];

const defaultBrands = [
  "Britannia",
  "Parle",
  "ITC",
  "GOPAL",
  "HUL",
  "SHREE",
  "PERFETTI",
  "Pepsico",
  "P&G",
  "Mamy Poko",
  "Haldirams"
];

const seedDefaultData = async () => {
  try {
    const brandCount = await Brand.countDocuments();
    if (brandCount === 0) {
      console.log('Seeding default brands into database...');
      await Brand.insertMany(defaultBrands.map(name => ({ name, isActive: true })));
    }

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('Seeding default categories into database...');
      await Category.insertMany(defaultCategories.map(name => ({ name, isActive: true })));
    }
  } catch (err) {
    console.error('Error auto-seeding default brands and categories:', err);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    await seedDefaultData();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
