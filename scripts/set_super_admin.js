import mongoose from 'mongoose';
import Admin from '../model/adminModel.js';
import dotenv from 'dotenv';

dotenv.config();

const setSuperAdmin = async () => {
  try {
    if (!process.env.DB_URL) {
      console.error('DB_URL is not defined in the environment variables.');
      process.exit(1);
    }

    await mongoose.connect(process.env.DB_URL);
    console.log('Database connected successfully.');

    const email = 'khan@gmail.com';
    let admin = await Admin.findOne({ email });

    if (admin) {
      admin.role = 'super_admin';
      await admin.save();
      console.log(`Updated existing user ${email} to role 'super_admin'.`);
    } else {
      // Create a new super admin if it does not exist
      admin = new Admin({
        name: 'Khan Super Admin',
        email: email,
        password: 'password123', // Default password
        role: 'super_admin',
        isActive: true,
      });
      await admin.save();
      console.log(`Created new super_admin user: ${email} with password: password123`);
    }

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
};

setSuperAdmin();
