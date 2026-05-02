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
  const { name, category } = req.body;

  // Only name and category are required by the current frontend admin panel
  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Name and Category are required',
    });
  }

  // Ensure numeric fields are parsed correctly if they exist, otherwise leave as is
  // The database model provides defaults for stock, mrp, etc.
  next();
};

export const validateUpdateProduct = (req, res, next) => {
  // All fields are optional during update
  next();
};

// Validate Delivery Partner Creation
export const validateCreateDeliveryPartner = (req, res, next) => {
  const { name, phone, email, password, vehicleType, vehicleNumber, licenseNumber } = req.body;

  if (!name || !phone || !email || !password || !vehicleType || !vehicleNumber || !licenseNumber) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required',
    });
  }

  // Validate email format
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  // Validate phone number (basic validation)
  if (phone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be at least 10 digits',
    });
  }

  // Validate vehicle type enum
  const validVehicleTypes = ['Bike', 'Scooter', 'Car', 'Van', 'Truck'];
  if (!validVehicleTypes.includes(vehicleType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid vehicle type',
    });
  }

  next();
};

// Validate Delivery Partner Update
export const validateUpdateDeliveryPartner = (req, res, next) => {
  const { phone, vehicleType, status } = req.body;

  // Validate phone if provided
  if (phone && phone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be at least 10 digits',
    });
  }

  // Validate vehicle type if provided
  if (vehicleType) {
    const validVehicleTypes = ['Bike', 'Scooter', 'Car', 'Van', 'Truck'];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type',
      });
    }
  }

  // Validate status if provided
  if (status) {
    const validStatuses = ['Available', 'Busy', 'Offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }
  }

  next();
};

// Validate Customer Registration
export const validateRegisterCustomer = (req, res, next) => {
  const { name, phone, email, password, shopName, adhaar, licenseNumber } = req.body;

  if (!name || !phone || !email || !password || !shopName || !adhaar || !licenseNumber) {
    return res.status(400).json({
      success: false,
      message: 'All fields including Shop Name, Aadhaar, and License are required',
    });
  }

  // Check for images in req.files
  if (!req.files || !req.files.adhaarImage || !req.files.licenseImage) {
    return res.status(400).json({
      success: false,
      message: 'Aadhaar and Shop License images are required',
    });
  }

  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  if (phone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be at least 10 digits',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long',
    });
  }



  if (req.body.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(req.body.pan)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid PAN format',
    });
  }

  if (req.body.adhaar && !/^\d{12}$/.test(req.body.adhaar)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Adhaar format (must be 12 digits)',
    });
  }

  next();
};

// Validate Customer Login
export const validateLoginCustomer = (req, res, next) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email/Phone and password are required',
    });
  }

  next();
};

// Validate Customer Update
export const validateUpdateCustomer = (req, res, next) => {
  const { phone, email } = req.body;

  if (email) {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }
  }

  if (phone && phone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be at least 10 digits',
    });
  }

  next();
};
