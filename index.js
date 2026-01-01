import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './db/connection.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();

// CORS Middleware
app.use(cors({
  origin: '*', // Allow all origins (change in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
// IMPORTANT: Do NOT use express.json() and express.urlencoded() for routes with file uploads
// They interfere with multer's multipart/form-data parsing
// Only apply them to routes that don't need file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
connectDB();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/product', productRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // Server started
});

