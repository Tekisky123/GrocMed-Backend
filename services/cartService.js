import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';

export const addToCartService = async (customerId, productId, quantity) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    const minimumQty = product.minimumQuantity || 1;

    // Use offerPrice if available, otherwise singleUnitPrice
    const price = product.offerPrice || product.singleUnitPrice;

    let cart = await Cart.findOne({ customer: customerId });

    if (cart) {
        // Check if product exists in cart
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

        if (itemIndex > -1) {
            // Update quantity (quantity parameter is the CHANGE/DIFF, not absolute)
            const newQuantity = cart.items[itemIndex].quantity + quantity;

            // Validate final quantity meets minimum (not the diff)
            if (newQuantity < minimumQty && newQuantity > 0) {
                throw new Error(`Total quantity must be at least ${minimumQty}`);
            }

            // Allow removal (quantity goes to 0 or negative)
            if (newQuantity <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = newQuantity;
                // Ensure price is updated to current price
                cart.items[itemIndex].price = price;
            }
        } else {
            // Add new item - validate initial quantity meets minimum
            if (quantity < minimumQty) {
                throw new Error(`Minimum quantity for ${product.name} is ${minimumQty}`);
            }
            cart.items.push({ product: productId, quantity, price });
        }
    } else {
        // Create new cart - validate initial quantity meets minimum
        if (quantity < minimumQty) {
            throw new Error(`Minimum quantity for ${product.name} is ${minimumQty}`);
        }
        cart = new Cart({
            customer: customerId,
            items: [{ product: productId, quantity, price }],
        });
    }

    await cart.save();
    return cart;
};

export const getCartService = async (customerId) => {
    const cart = await Cart.findOne({ customer: customerId }).populate({
        path: 'items.product',
        select: 'name images brand unitType perUnitWeightVolume singleUnitPrice mrp offerPrice isActive minimumQuantity stock',
    });

    if (!cart) {
        return { items: [], totalAmount: 0 };
    }
    return cart;
};

export const removeFromCartService = async (customerId, productId) => {
    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) throw new Error('Cart not found');

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    return cart;
};
