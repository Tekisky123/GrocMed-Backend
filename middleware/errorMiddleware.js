export const errorHandler = (err, req, res, next) => {
  // Default error
  let statusCode = 500;
  let message = err.message || 'Something went wrong!';

  // Handle specific error types
  if (err.message === 'Admin not found' || err.message === 'Product not found') {
    statusCode = 404;
  } else if (
    err.message === 'Admin with this email already exists' ||
    err.message === 'Email already in use by another admin' ||
    err.message === 'Product with this name already exists'
  ) {
    statusCode = 400;
  } else if (
    err.message === 'Invalid email or password' ||
    err.message === 'Admin account is inactive'
  ) {
    statusCode = 401;
  } else if (err.message === 'Failed to upload image to S3' || err.message === 'Failed to delete image from S3') {
    statusCode = 500;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.message === 'Only image files are allowed') {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

