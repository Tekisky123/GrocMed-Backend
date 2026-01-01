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
  const brand = req.body.brand;
  const category = req.body.category;
  const unitType = req.body.unitType;
  const perUnitWeightVolume = req.body.perUnitWeightVolume;
  const unitsPerUnitType = req.body.unitsPerUnitType;
  const mrp = req.body.mrp;
  const offerPrice = req.body.offerPrice;
  const singleUnitPrice = req.body.singleUnitPrice;
  const stock = req.body.stock;
  const manfDate = req.body.manfDate;
  const expiryDate = req.body.expiryDate;
  const notifyCustomers = req.body.notifyCustomers;
  const isOffer = req.body.isOffer;
  const isActive = req.body.isActive;

  // Convert string values to appropriate types if needed
  const parsedUnitsPerUnitType = unitsPerUnitType !== undefined ? (typeof unitsPerUnitType === 'string' ? parseInt(unitsPerUnitType) : unitsPerUnitType) : 1;
  const parsedMrp = typeof mrp === 'string' ? parseFloat(mrp) : mrp;
  const parsedOfferPrice = typeof offerPrice === 'string' ? parseFloat(offerPrice) : offerPrice;
  const parsedSingleUnitPrice = typeof singleUnitPrice === 'string' ? parseFloat(singleUnitPrice) : singleUnitPrice;
  const parsedStock = stock !== undefined ? (typeof stock === 'string' ? parseInt(stock) : stock) : undefined;
  const parsedNotifyCustomers = notifyCustomers !== undefined ? (typeof notifyCustomers === 'string' ? notifyCustomers === 'true' : notifyCustomers) : false;
  const parsedIsOffer = isOffer !== undefined ? (typeof isOffer === 'string' ? isOffer === 'true' : isOffer) : false;
  const parsedIsActive = isActive !== undefined ? (typeof isActive === 'string' ? isActive === 'true' : isActive) : undefined;

  // Validate required fields
  if (!name || !description || !brand || !category) {
    return res.status(400).json({
      success: false,
      message: 'Name, description, brand, and category are required',
    });
  }

  // Validate packaging fields
  if (!unitType || !perUnitWeightVolume) {
    return res.status(400).json({
      success: false,
      message: 'Packaging type and unit weight/volume are required',
    });
  }

  // Validate units per package
  if (parsedUnitsPerUnitType !== undefined) {
    if (isNaN(parsedUnitsPerUnitType) || parsedUnitsPerUnitType < 1) {
      return res.status(400).json({
        success: false,
        message: 'Units per package must be at least 1',
      });
    }
  }

  // Validate package pricing
  if (mrp === undefined || mrp === null || offerPrice === undefined || offerPrice === null) {
    return res.status(400).json({
      success: false,
      message: 'Package MRP and offer price are required',
    });
  }

  if (isNaN(parsedMrp) || parsedMrp < 0) {
    return res.status(400).json({
      success: false,
      message: 'Package MRP must be a valid positive number',
    });
  }

  if (isNaN(parsedOfferPrice) || parsedOfferPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'Package offer price must be a valid positive number',
    });
  }

  if (parsedOfferPrice > parsedMrp) {
    return res.status(400).json({
      success: false,
      message: 'Package offer price cannot be greater than MRP',
    });
  }

  // Validate single unit price
  if (singleUnitPrice === undefined || singleUnitPrice === null) {
    return res.status(400).json({
      success: false,
      message: 'Single unit price is required',
    });
  }

  if (isNaN(parsedSingleUnitPrice) || parsedSingleUnitPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'Single unit price must be a valid positive number',
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
  req.body.unitsPerUnitType = parsedUnitsPerUnitType;
  req.body.mrp = parsedMrp;
  req.body.offerPrice = parsedOfferPrice;
  req.body.singleUnitPrice = parsedSingleUnitPrice;
  if (parsedStock !== undefined) req.body.stock = parsedStock;
  req.body.notifyCustomers = parsedNotifyCustomers;
  req.body.isOffer = parsedIsOffer;
  if (parsedIsActive !== undefined) req.body.isActive = parsedIsActive;

  next();
};

export const validateUpdateProduct = (req, res, next) => {
  const {
    unitsPerUnitType, mrp, offerPrice, singleUnitPrice, stock
  } = req.body;

  // Validate units per package if provided
  if (unitsPerUnitType !== undefined) {
    if (isNaN(unitsPerUnitType) || parseInt(unitsPerUnitType) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Units per package must be at least 1',
      });
    }
  }

  // Validate package MRP if provided
  if (mrp !== undefined) {
    if (isNaN(mrp) || parseFloat(mrp) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Package MRP must be a valid positive number',
      });
    }
  }

  // Validate package offer price if provided
  if (offerPrice !== undefined) {
    if (isNaN(offerPrice) || parseFloat(offerPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Package offer price must be a valid positive number',
      });
    }
  }

  // Validate package offer price doesn't exceed MRP (if both are being updated)
  if (mrp !== undefined && offerPrice !== undefined) {
    if (parseFloat(offerPrice) > parseFloat(mrp)) {
      return res.status(400).json({
        success: false,
        message: 'Package offer price cannot be greater than MRP',
      });
    }
  }

  // Validate single unit price if provided
  if (singleUnitPrice !== undefined) {
    if (isNaN(singleUnitPrice) || parseFloat(singleUnitPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Single unit price must be a valid positive number',
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
