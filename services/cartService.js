import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';

export const addToCartService = async (customerId, productId, quantity) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    // Use offerPrice if available, otherwise singleUnitPrice
    const price = product.offerPrice || product.singleUnitPrice;

    let cart = await Cart.findOne({ customer: customerId });

    if (cart) {
        // Check if product exists in cart
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

        if (itemIndex > -1) {
            // Update quantity
            cart.items[itemIndex].quantity += quantity;
            // Ensure price is updated to current price
            cart.items[itemIndex].price = price;
        } else {
            // Add new item
            cart.items.push({ product: productId, quantity, price });
        }
    } else {
        // Create new cart
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
        select: 'name images brand unitType perUnitWeightVolume singleUnitPrice mrp offerPrice isActive',
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
