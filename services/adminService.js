import Admin from '../model/adminModel.js';

export const createAdminService = async (adminData) => {
  const { name, email, password, role } = adminData;

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    throw new Error('Admin with this email already exists');
  }

  const admin = new Admin({
    name,
    email,
    password,
    role: role || 'admin',
  });

  const savedAdmin = await admin.save();
  return {
    id: savedAdmin._id,
    name: savedAdmin.name,
    email: savedAdmin.email,
    role: savedAdmin.role,
    isActive: savedAdmin.isActive,
    createdAt: savedAdmin.createdAt,
  };
};

export const getAllAdminsService = async () => {
  const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
  return admins;
};

export const getAdminByIdService = async (adminId) => {
  const admin = await Admin.findById(adminId).select('-password');
  if (!admin) {
    throw new Error('Admin not found');
  }
  return admin;
};

export const updateAdminService = async (adminId, updateData) => {
  const { name, email, role, isActive } = updateData;

  // Check if email is being updated and if it already exists
  if (email) {
    const existingAdmin = await Admin.findOne({ email, _id: { $ne: adminId } });
    if (existingAdmin) {
      throw new Error('Email already in use by another admin');
    }
  }

  const admin = await Admin.findByIdAndUpdate(
    adminId,
    {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!admin) {
    throw new Error('Admin not found');
  }

  return admin;
};

export const deleteAdminService = async (adminId) => {
  const admin = await Admin.findByIdAndDelete(adminId);
  if (!admin) {
    throw new Error('Admin not found');
  }
  return { message: 'Admin deleted successfully' };
};

export const loginAdminService = async (email, password) => {
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error('Invalid email or password');
  }

  if (!admin.isActive) {
    throw new Error('Admin account is inactive');
  }

  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
};

