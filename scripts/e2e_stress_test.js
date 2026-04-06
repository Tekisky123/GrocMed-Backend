import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import Product from '../model/productModel.js';
import Customer from '../model/customerModel.js';
import Cart from '../model/cartModel.js';
import Order from '../model/orderModel.js';

// Import Services
import { createOrderService, updateOrderStatusService } from '../services/orderService.js';
import { updateProductService } from '../services/productService.js';

const runStressTest = async () => {
    try {
        console.log('=== STARTING EXTENDED EDGE-CASE & STRESS SIMULATION ===\n');
        
        await mongoose.connect(process.env.DB_URL);
        console.log('Database connected successfully.\n');

        let customer = await Customer.findOne();
        if (!customer) throw new Error("No customer found in mock DB");

        // Cleanup any previous stray tests
        await Product.deleteMany({ name: { $regex: /Stress Test Product/i } });

        // Setup 2 Products (Mixed Slabs)
        console.log('--- SETTING UP MULTI-SLAB CART ---');
        const p1 = await Product.create({
            name: `Stress Test Product A ${Date.now()}`, description: '5% Slab', brand: 'GrocMed', category: 'Testing',
            singleUnitPrice: 100, stock: 10, mrp: 120, offerPrice: 100, gstRate: 5, createdBy: customer._id,
            unitType: 'Single Item', perUnitWeightVolume: '100g'
        });
        
        const p2 = await Product.create({
            name: `Stress Test Product B ${Date.now()}`, description: '28% Slab', brand: 'GrocMed', category: 'Testing',
            singleUnitPrice: 200, stock: 3, mrp: 220, offerPrice: 200, gstRate: 28, createdBy: customer._id,
            unitType: 'Single Item', perUnitWeightVolume: '100g'
        });

        // ========================================================
        // EDGE CASE 1: Mixed Tax Slabs
        // ========================================================
        console.log('\n--- EXTENDED TEST 1: Mixed Tax Slabs ---');
        let cart = await Cart.findOne({ customer: customer._id });
        if (!cart) cart = new Cart({ customer: customer._id, items: [] });
        
        cart.items = [
            { product: p1, quantity: 2, price: 100 },
            { product: p2, quantity: 1, price: 200 }
        ];
        cart.totalAmount = 400; // 2*100 + 1*200
        await cart.save();

        const orderData = { shippingAddress: { street: 'Main St', city: 'City', state: 'TS', zip: '123' }, paymentMethod: 'Online' };
        
        let mixedOrder = await createOrderService(customer._id, orderData);
        console.log(`✅ Mixed Order Created: ${mixedOrder._id}`);
        console.log(`Product A Snapshot -> GST: ${mixedOrder.items[0].gstRate}%`);
        console.log(`Product B Snapshot -> GST: ${mixedOrder.items[1].gstRate}%`);

        // ========================================================
        // EDGE CASE 2: Post-Order Product Mutations (Immutability)
        // ========================================================
        console.log('\n--- EXTENDED TEST 2: Schema Immutability ---');
        console.log('Simulating Admin doubling prices & changing GST to 18% on live product...');
        
        p1.singleUnitPrice = 500;
        p1.gstRate = 18;
        await p1.save();

        const reFetchedOrder = await Order.findById(mixedOrder._id);
        if (reFetchedOrder.items[0].gstRate === 5 && reFetchedOrder.items[0].price === 100) {
            console.log('✅ Immutability Protected! Order snapshot resisted live database mutation.');
        } else {
            console.log('❌ VULNERABILITY DETECTED: Order history reflects live database changes!');
        }

        // ========================================================
        // EDGE CASE 3: Concurrency (Race Conditions)
        // ========================================================
        console.log('\n--- EXTENDED TEST 3: Extreme Concurrency ($inc vs Lock) ---');
        console.log(`Current Stock for Product B: ${(await Product.findById(p2._id)).stock}`);
        
        // Reset cart for P2 with remaining limit
        cart = await Cart.findOne({ customer: customer._id });
        cart.items = [{ product: p2, quantity: 2, price: 200 }];
        cart.totalAmount = 400;
        await cart.save();

        console.log('Simulating 2 simultaneous requests for the exact same cart instance...');
        try {
            await Promise.all([
                createOrderService(customer._id, orderData).catch(e => e),
                createOrderService(customer._id, orderData).catch(e => e)
            ]);
        } catch (e) {
            // Expected
        }
        
        const finalP2Stock = (await Product.findById(p2._id)).stock;
        console.log(`Final Stock for Product B: ${finalP2Stock}`);
        if (finalP2Stock < 0) {
            console.log('❌ VULNERABILITY DETECTED: Race condition achieved. Stock went negative due to missing MongoDB Session/Transactions.');
        } else {
            console.log('✅ Stock constraints held securely through concurrent assault.');
        }


        // ========================================================
        // EDGE CASE 4: Cancellation & Returns (GST Reversals)
        // ========================================================
        console.log('\n--- EXTENDED TEST 4: Cancellations & Stock Reversal Check ---');
        await updateOrderStatusService(mixedOrder._id, 'Cancelled');
        
        const cancelledStockP1 = (await Product.findById(p1._id)).stock;
        if (cancelledStockP1 === 10) {
             console.log('✅ Stock returned to shelf upon Cancellation.');
        } else {
             console.log(`❌ VULNERABILITY DETECTED: Stock did NOT return to shelf! Initial: 10, Current: ${cancelledStockP1}.`);
        }
        
        // ========================================================
        // EDGE CASE 5: IGST Validation Lookahead
        // ========================================================
        console.log('\n--- EXTENDED TEST 5: IGST Structure ---');
        console.log('Validating Inter-State IGST variables on schema...');
        if (mixedOrder.taxAmount > 0 && mixedOrder.igstAmount === undefined) {
             console.log('❌ VULNERABILITY DETECTED: Schema defaults ALL taxes. No logic splits IGST vs CGST/SGST by State Codes.');
        } else {
             console.log(`✅ Interstate Taxation successfully routed. IGST calculated independently: ₹${mixedOrder.igstAmount}`);
        }

        // ========================================================
        // EDGE CASE 6: Post-Delivery Cancellation Block
        // ========================================================
        console.log('\n--- EXTENDED TEST 6: Admin Operational Block ---');
        // Let's create a dummy order simulating delivered status
        const deliveredOrder = new Order({
             customer: customer._id,
             items: [],
             totalAmount: 100,
             orderStatus: 'Delivered'
        });
        await deliveredOrder.save();
        
        try {
             console.log('Simulating Admin attempting to Cancel a Delivered order prematurely...');
             await updateOrderStatusService(deliveredOrder._id, 'Cancelled');
             console.log('❌ VULNERABILITY DETECTED: Admin successfully breached post-delivery pipeline!');
        } catch (error) {
             console.log(`✅ System intelligently halted illegal payload: "${error.message}"`);
        }

        // ========================================================
        // EDGE CASE 7: Refund State Synchronization
        // ========================================================
        console.log('\n--- EXTENDED TEST 7: Finance Refund Synchronization ---');
        const syncOrder = new Order({
             customer: customer._id,
             items: [],
             totalAmount: 100,
             paymentMethod: 'Online',
             paymentStatus: 'Paid',
             orderStatus: 'Placed'
        });
        await syncOrder.save();
        
        console.log(`Admin triggers legal Return state on order...`);
        const resultSync = await updateOrderStatusService(syncOrder._id, 'Returned');
        console.log(`Checking internal Refund Tracking state... -> ${resultSync.refundStatus}`);
        if (resultSync.refundStatus === 'Pending') {
             console.log('✅ Synchronized! Financial API flagged accurately parallel to Fulfillment API.');
        } else {
             console.log('❌ VULNERABILITY DETECTED: Finance array failed to bind to physical logistics updates.');
        }

        // Clean up
        console.log('\nCleaning up Stress Test artifacts...');
        await Product.deleteMany({ _id: { $in: [p1._id, p2._id] } });
        await Order.findByIdAndDelete(mixedOrder._id);
        await Order.findByIdAndDelete(deliveredOrder._id);
        await Order.findByIdAndDelete(syncOrder._id);

    } catch (error) {
        console.error('\n❌ STRESS TEST FAILED CRITICALLY:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n=== STRESS SIMULATION RUN COMPLETED ===');
    }
};

runStressTest();
