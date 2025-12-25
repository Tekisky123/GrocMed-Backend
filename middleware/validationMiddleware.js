export const validateCreateAdmin = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    });
  }

  // Basic email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long',
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  next();
};

export const validateCreateProduct = (req, res, next) => {
  // Parse body fields - handle both JSON and form-data
  const name = req.body.name;
  const description = req.body.description;
  const price = req.body.price;
  const category = req.body.category;
  const stock = req.body.stock;
  const isActive = req.body.isActive;

  // Convert string values to appropriate types if needed
  const parsedPrice = typeof price === 'string' ? parseFloat(price) : price;
  const parsedStock = stock !== undefined ? (typeof stock === 'string' ? parseInt(stock) : stock) : undefined;
  const parsedIsActive = isActive !== undefined ? (typeof isActive === 'string' ? isActive === 'true' : isActive) : undefined;

  if (!name || !description || price === undefined || price === null || !category) {
    return res.status(400).json({
      success: false,
      message: 'Name, description, price, and category are required',
    });
  }

  // Validate price is a number
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'Price must be a valid positive number',
    });
  }

  // Validate stock if provided
  if (parsedStock !== undefined) {
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a valid positive number',
      });
    }
  }

  // Update req.body with parsed values
  req.body.price = parsedPrice;
  if (parsedStock !== undefined) req.body.stock = parsedStock;
  if (parsedIsActive !== undefined) req.body.isActive = parsedIsActive;

  next();
};

export const validateUpdateProduct = (req, res, next) => {
  const { price, stock } = req.body;

  // Validate price if provided
  if (price !== undefined) {
    if (isNaN(price) || parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number',
      });
    }
  }

  // Validate stock if provided
  if (stock !== undefined) {
    if (isNaN(stock) || parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a valid positive number',
      });
    }
  }

  next();
};
