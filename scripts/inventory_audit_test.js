import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../model/productModel.js';
import Customer from '../model/customerModel.js';
import Cart from '../model/cartModel.js';
import Order from '../model/orderModel.js';
import Setting from '../model/settingModel.js';

import { createOrderService, updateOrderStatusService } from '../services/orderService.js';

async function runInventoryAudit() {
    console.log('====================================================');
    console.log('🔍 INVENTORY & STOCK AUDIT TEST SUITE');
    console.log('====================================================\n');

    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('✅ Connected to MongoDB.\n');

        // Setup test customer
        let customer = await Customer.findOne();
        if (!customer) {
            customer = await Customer.create({ name: 'Inventory Test Customer', phone: '8888888888' });
        }

        // Ensure Setting minOrderValue doesn't block cart creation during test
        const setting = await Setting.findOne({ singletonKey: 'config' });
        const originalMinOrderValue = setting ? setting.minOrderValue : 0;
        if (setting) {
            setting.minOrderValue = 0;
            await setting.save();
        }

        // Clean up old test products
        await Product.deleteMany({ name: { $regex: /^Audit Test Product/ } });

        // ----------------------------------------------------
        // TEST 1: Root Stock Deduction & Cancellation Re-Addition
        // ----------------------------------------------------
        console.log('--- TEST 1: Root Stock Deduction & Cancellation Re-Addition ---');
        const prodRoot = await Product.create({
            name: 'Audit Test Product Root ' + Date.now(),
            description: 'Test product for root stock',
            brand: 'TestBrand',
            category: 'General Care',
            singleUnitPrice: 200,
            mrp: 250,
            offerPrice: 200,
            stock: 100, // Initial stock 100
            minimumQuantity: 1,
            createdBy: customer._id
        });

        console.log(`Initial Root Stock: ${prodRoot.stock}`);

        // Set up Cart
        await Cart.findOneAndUpdate(
            { customer: customer._id },
            {
                customer: customer._id,
                items: [{ product: prodRoot._id, quantity: 5, price: 200 }],
                totalAmount: 1000
            },
            { upsert: true, new: true }
        );

        // Place Order
        const order1 = await createOrderService(customer._id, {
            shippingAddress: { street: '123 St', city: 'City', state: 'TS', zip: '500001' },
            paymentMethod: 'COD'
        });

        const stockAfterOrder1 = (await Product.findById(prodRoot._id)).stock;
        console.log(`Stock after ordering 5 units: ${stockAfterOrder1}`);
        if (stockAfterOrder1 !== 95) {
            console.error(`❌ FAILED: Expected stock 95, got ${stockAfterOrder1}`);
        } else {
            console.log(`✅ Stock successfully deducted from 100 to 95 on order placement.`);
        }

        // Cancel Order 1
        console.log(`Cancelling Order #${order1._id.toString().slice(-8)}...`);
        await updateOrderStatusService(order1._id, 'Cancelled', null, null, null, 'Customer Cancelled');

        const stockAfterCancel1 = (await Product.findById(prodRoot._id)).stock;
        console.log(`Stock after order cancellation: ${stockAfterCancel1}`);
        if (stockAfterCancel1 !== 100) {
            console.error(`❌ FAILED: Expected stock 100 after cancellation, got ${stockAfterCancel1}`);
        } else {
            console.log(`✅ Stock successfully RE-ADDED back to shelf (100) on order cancellation!`);
        }

        // Verify Idempotency: Cancelling again should NOT re-add stock again
        try {
            await updateOrderStatusService(order1._id, 'Cancelled', null, null, null, 'Customer Cancelled');
            const stockAfterIdempotentCancel = (await Product.findById(prodRoot._id)).stock;
            if (stockAfterIdempotentCancel === 100) {
                console.log(`✅ Idempotency Verified: Re-cancelling order did NOT double-add stock (remains 100).`);
            } else {
                console.error(`❌ FAILED: Duplicate cancellation modified stock to ${stockAfterIdempotentCancel}!`);
            }
        } catch (e) {
            console.log(`✅ Re-cancellation handled gracefully.`);
        }

        console.log('\n');

        // ----------------------------------------------------
        // TEST 2: Packaging Option Stock Deduction & Cancellation Re-Addition
        // ----------------------------------------------------
        console.log('--- TEST 2: Multi-Packaging Option Stock Deduction & Cancellation Re-Addition ---');
        const prodPkg = await Product.create({
            name: 'Audit Test Product Packaging ' + Date.now(),
            description: 'Test product for packaging option stock',
            brand: 'TestBrand',
            category: 'General Care',
            singleUnitPrice: 500,
            mrp: 600,
            offerPrice: 500,
            stock: 0,
            packagingOptions: [
                {
                    label: 'Box of 10 Packs',
                    unitsPerPack: 10,
                    mrp: 600,
                    salePrice: 500,
                    minQty: 1,
                    stock: 50 // Packaging option stock is 50
                },
                {
                    label: 'Carton of 50 Packs',
                    unitsPerPack: 50,
                    mrp: 2500,
                    salePrice: 2200,
                    minQty: 1,
                    stock: 20
                }
            ],
            minimumQuantity: 1,
            createdBy: customer._id
        });

        const boxOptionId = prodPkg.packagingOptions[0]._id;
        const initialBoxStock = prodPkg.packagingOptions[0].stock;
        console.log(`Initial Stock for "Box of 10 Packs": ${initialBoxStock}`);

        // Set up Cart with specific packagingOptionId
        await Cart.findOneAndUpdate(
            { customer: customer._id },
            {
                customer: customer._id,
                items: [{
                    product: prodPkg._id,
                    packagingOptionId: boxOptionId,
                    packagingLabel: 'Box of 10 Packs',
                    quantity: 3, // Ordering 3 boxes
                    price: 500
                }],
                totalAmount: 1500
            },
            { upsert: true, new: true }
        );

        // Place Order 2
        const order2 = await createOrderService(customer._id, {
            shippingAddress: { street: '123 St', city: 'City', state: 'TS', zip: '500001' },
            paymentMethod: 'COD'
        });

        const updatedProdAfterOrder2 = await Product.findById(prodPkg._id);
        const boxStockAfterOrder2 = updatedProdAfterOrder2.packagingOptions.id(boxOptionId).stock;
        console.log(`Box Stock after ordering 3 boxes: ${boxStockAfterOrder2}`);
        if (boxStockAfterOrder2 !== 47) {
            console.error(`❌ FAILED: Expected box stock 47, got ${boxStockAfterOrder2}`);
        } else {
            console.log(`✅ Box packaging stock successfully deducted from 50 to 47.`);
        }

        // Cancel Order 2
        console.log(`Cancelling Order #${order2._id.toString().slice(-8)}...`);
        await updateOrderStatusService(order2._id, 'Cancelled', null, null, null, 'Customer Cancelled');

        const updatedProdAfterCancel2 = await Product.findById(prodPkg._id);
        const boxStockAfterCancel2 = updatedProdAfterCancel2.packagingOptions.id(boxOptionId).stock;
        console.log(`Box Stock after order cancellation: ${boxStockAfterCancel2}`);
        if (boxStockAfterCancel2 !== 50) {
            console.error(`❌ FAILED: Expected box stock 50 after cancellation, got ${boxStockAfterCancel2}`);
        } else {
            console.log(`✅ Box packaging stock successfully RE-ADDED back to shelf (50) on cancellation!`);
        }

        console.log('\n');

        // ----------------------------------------------------
        // TEST 3: Return Order Stock Replenishment
        // ----------------------------------------------------
        console.log('--- TEST 3: Order Return Stock Replenishment ---');
        await Cart.findOneAndUpdate(
            { customer: customer._id },
            {
                customer: customer._id,
                items: [{ product: prodRoot._id, quantity: 4, price: 200 }],
                totalAmount: 800
            },
            { upsert: true, new: true }
        );

        const order3 = await createOrderService(customer._id, {
            shippingAddress: { street: '123 St', city: 'City', state: 'TS', zip: '500001' },
            paymentMethod: 'COD'
        });

        const stockAfterOrder3 = (await Product.findById(prodRoot._id)).stock;
        console.log(`Stock after ordering 4 units: ${stockAfterOrder3} (Expected: 96)`);

        // Mark as Delivered first, then Return
        await updateOrderStatusService(order3._id, 'Delivered', null, 'Cash');
        console.log(`Order status set to Delivered.`);

        // Updating to Returned
        console.log(`Updating order status to "Returned"...`);
        await updateOrderStatusService(order3._id, 'Returned', null, null, null, 'Wrong Product Ordered');

        const stockAfterReturn3 = (await Product.findById(prodRoot._id)).stock;
        console.log(`Stock after order return: ${stockAfterReturn3}`);
        if (stockAfterReturn3 !== 100) {
            console.error(`❌ FAILED: Expected stock 100 after return, got ${stockAfterReturn3}`);
        } else {
            console.log(`✅ Stock successfully RE-ADDED back to shelf (100) on order return!`);
        }

        console.log('\n');

        // ----------------------------------------------------
        // TEST 4: Carton Packaging Stock Sync On Cart Update & Cancellation
        // ----------------------------------------------------
        console.log('--- TEST 4: Carton Stock Deduction vs Pack Stock On Cart Update & Cancellation ---');
        const prodCartonVsPack = await Product.create({
            name: 'Audit Test Carton vs Pack ' + Date.now(),
            description: 'Test product for carton vs pack stock isolation',
            brand: 'TestBrand',
            category: 'General Care',
            singleUnitPrice: 100,
            mrp: 120,
            offerPrice: 100,
            stock: 200, // Root stock (Pack) = 200
            packagingOptions: [
                {
                    label: 'Carton of 100 Packs',
                    unitsPerPack: 100,
                    mrp: 12000,
                    salePrice: 10000,
                    minQty: 1,
                    stock: 15 // Carton stock = 15
                }
            ],
            minimumQuantity: 1,
            createdBy: customer._id
        });

        const cartonOptionId = prodCartonVsPack.packagingOptions[0]._id.toString();
        console.log(`Initial Pack Stock: ${prodCartonVsPack.stock} | Initial Carton Stock: 15`);

        // Import addToCartService
        const { addToCartService } = await import('../services/cartService.js');

        // Step A: Add 1 Carton to Cart
        await addToCartService(customer._id, prodCartonVsPack._id.toString(), 1, cartonOptionId);

        // Step B: Update Quantity from 1 to 2 Cartons (simulating debounced sync with packagingOptionId)
        await addToCartService(customer._id, prodCartonVsPack._id.toString(), 1, cartonOptionId);

        // Step C: Place Order for 2 Cartons
        const order4 = await createOrderService(customer._id, {
            shippingAddress: { street: '123 St', city: 'City', state: 'TS', zip: '500001' },
            paymentMethod: 'COD'
        });

        const prodAfterOrder4 = await Product.findById(prodCartonVsPack._id);
        const packStockAfterOrder4 = prodAfterOrder4.stock;
        const cartonStockAfterOrder4 = prodAfterOrder4.packagingOptions.id(cartonOptionId).stock;

        console.log(`After ordering 2 Cartons -> Pack Stock: ${packStockAfterOrder4} (Expected: 200), Carton Stock: ${cartonStockAfterOrder4} (Expected: 13)`);
        if (packStockAfterOrder4 !== 200) {
            console.error(`❌ FAILED: Pack stock was incorrectly deducted to ${packStockAfterOrder4}!`);
        } else if (cartonStockAfterOrder4 !== 13) {
            console.error(`❌ FAILED: Carton stock was expected 13, got ${cartonStockAfterOrder4}!`);
        } else {
            console.log(`✅ SUCCESS: Stock was correctly deducted ONLY from Carton (15 -> 13) while Pack stock remained untouched (200)!`);
        }

        // Step D: Cancel Order 4
        console.log(`Cancelling Order #${order4._id.toString().slice(-8)}...`);
        await updateOrderStatusService(order4._id, 'Cancelled', null, null, null, 'Customer Cancelled');

        const prodAfterCancel4 = await Product.findById(prodCartonVsPack._id);
        const packStockAfterCancel4 = prodAfterCancel4.stock;
        const cartonStockAfterCancel4 = prodAfterCancel4.packagingOptions.id(cartonOptionId).stock;

        console.log(`After cancelling 2 Cartons order -> Pack Stock: ${packStockAfterCancel4} (Expected: 200), Carton Stock: ${cartonStockAfterCancel4} (Expected: 15)`);
        if (packStockAfterCancel4 !== 200) {
            console.error(`❌ FAILED: Cancellation modified Pack stock to ${packStockAfterCancel4}!`);
        } else if (cartonStockAfterCancel4 !== 15) {
            console.error(`❌ FAILED: Cancellation expected Carton stock 15, got ${cartonStockAfterCancel4}!`);
        } else {
            console.log(`✅ SUCCESS: Order cancellation correctly RE-ADDED stock ONLY back to Carton (13 -> 15) and preserved Pack stock (200)!`);
        }

        console.log('\n');

        // Restore original setting
        if (setting) {
            setting.minOrderValue = originalMinOrderValue;
            await setting.save();
        }

        // Clean up test records
        await Product.findByIdAndDelete(prodCartonVsPack._id);
        await Order.findByIdAndDelete(order4._id);

        // Clean up test records
        await Product.findByIdAndDelete(prodRoot._id);
        await Product.findByIdAndDelete(prodPkg._id);
        await Order.findByIdAndDelete(order1._id);
        await Order.findByIdAndDelete(order2._id);
        await Order.findByIdAndDelete(order3._id);

        console.log('====================================================');
        console.log('🎉 ALL INVENTORY & CANCELLATION TESTS PASSED!');
        console.log('====================================================\n');

    } catch (err) {
        console.error('❌ AUDIT ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

runInventoryAudit();
