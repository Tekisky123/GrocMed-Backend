import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import Product from '../model/productModel.js';

const run = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        const product = await Product.findOne({ name: { $regex: /Mamy Poko/i } });
        if (product && product.packagingOptions) {
            let updated = false;
            product.packagingOptions.forEach(opt => {
                if (opt.label.toLowerCase().includes('pack')) {
                    opt.stock = 100;
                    updated = true;
                }
            });
            if (updated) {
                product.markModified('packagingOptions');
                await product.save();
                console.log('Fixed Mamy Poko stock!');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
