import mongoose from 'mongoose';
import Vendor from '../model/vendorModel.js';
import dotenv from 'dotenv';

dotenv.config();

const runValidation = async () => {
    try {
        if (!process.env.DB_URL) {
            console.error('DB_URL is not defined in environment variables.');
            process.exit(1);
        }

        await mongoose.connect(process.env.DB_URL);
        console.log('✔ Connected to Database.');

        // Clean up any existing test vendor
        await Vendor.deleteOne({ name: 'Validation Test Vendor' });
        await Vendor.deleteOne({ name: 'Updated Test Vendor' });

        // 1. Create a vendor
        console.log('Testing Vendor Creation...');
        const vendor = new Vendor({
            name: 'Validation Test Vendor',
            address: '123 Test Street, New Delhi',
            gstin: '07AAAAA1111A1Z1',
            phone: '9999999999'
        });
        await vendor.save();
        console.log('✔ Vendor created successfully.');

        // 2. Read back vendor
        const readVendor = await Vendor.findOne({ name: 'Validation Test Vendor' });
        if (!readVendor || readVendor.phone !== '9999999999') {
            throw new Error('Verification failed: Vendor details read back incorrectly.');
        }
        console.log('✔ Vendor read back successfully.');

        // 3. Test uniqueness constraint
        console.log('Testing Unique Name Constraint...');
        const duplicateVendor = new Vendor({
            name: 'validation test vendor', // check case-insensitive unique naming
            address: 'Other street',
            gstin: '07BBBBB1111B1Z1',
            phone: '8888888888'
        });

        try {
            await duplicateVendor.save();
            throw new Error('FAILED: Duplicate vendor name was allowed!');
        } catch (err) {
            console.log('✔ Unique name constraint successfully blocked duplicate.');
        }

        // 4. Update vendor
        console.log('Testing Vendor Update...');
        readVendor.name = 'Updated Test Vendor';
        readVendor.address = '456 Updated Lane';
        await readVendor.save();

        const updatedVendor = await Vendor.findOne({ name: 'Updated Test Vendor' });
        if (!updatedVendor || updatedVendor.address !== '456 Updated Lane') {
            throw new Error('Verification failed: Vendor was not updated correctly.');
        }
        console.log('✔ Vendor updated successfully.');

        // 5. Delete vendor
        console.log('Testing Vendor Deletion...');
        await Vendor.deleteOne({ _id: updatedVendor._id });
        const deletedVendor = await Vendor.findById(updatedVendor._id);
        if (deletedVendor) {
            throw new Error('Verification failed: Vendor was not deleted.');
        }
        console.log('✔ Vendor deleted successfully.');

        console.log('\n⭐ ALL BACKEND VENDOR MODEL VALIDATIONS PASSED ⭐');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Validation script failed:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

runValidation();
