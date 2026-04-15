import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';

export const addToCartService = async (customerId, productId, quantity, packagingOptionId = null) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Determine price and minQty based on packaging option
    let price;
    let minimumQty;
    let packagingLabel = null;

    if (packagingOptionId && product.packagingOptions?.length > 0) {
        const option = product.packagingOptions.find(
            (o) => o._id.toString() === packagingOptionId.toString()
        );
        if (!option) throw new Error('Packaging option not found');

        price = option.salePrice;
        minimumQty = option.minQty || 1;
        packagingLabel = option.label;
    } else {
        // Fallback to product-level pricing
        price = product.offerPrice || product.singleUnitPrice || product.mrp;
        minimumQty = product.minimumQuantity || 1;
    }

    // Unique key per product + option combination
    const optionKey = packagingOptionId ? packagingOptionId.toString() : 'default';

    let cart = await Cart.findOne({ customer: customerId });

    if (cart) {
        // Find existing item matching product + same packaging option
        const itemIndex = cart.items.findIndex(
            (item) =>
                item.product.toString() === productId &&
                (item.packagingOptionId?.toString() || 'default') === optionKey
        );

        if (itemIndex > -1) {
            const newQuantity = cart.items[itemIndex].quantity + quantity;

            if (newQuantity < minimumQty && newQuantity > 0) {
                throw new Error(`Total quantity must be at least ${minimumQty}`);
            }

            if (newQuantity <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = newQuantity;
                cart.items[itemIndex].price = price;
            }
        } else {
            if (quantity < minimumQty) {
                throw new Error(`Minimum quantity for ${product.name} is ${minimumQty}`);
            }
            cart.items.push({
                product: productId,
                quantity,
                price,
                packagingOptionId: packagingOptionId || null,
                packagingLabel,
            });
        }
    } else {
        if (quantity < minimumQty) {
            throw new Error(`Minimum quantity for ${product.name} is ${minimumQty}`);
        }
        cart = new Cart({
            customer: customerId,
            items: [{
                product: productId,
                quantity,
                price,
                packagingOptionId: packagingOptionId || null,
                packagingLabel,
            }],
        });
    }

    await cart.save();
    return cart;
};

export const getCartService = async (customerId) => {
    const cart = await Cart.findOne({ customer: customerId }).populate({
        path: 'items.product',
        select: 'name images brand unitType perUnitWeightVolume singleUnitPrice mrp offerPrice isActive minimumQuantity stock packagingOptions',
    });

    if (!cart) {
        return { items: [], totalAmount: 0 };
    }
    return cart;
};

export const removeFromCartService = async (customerId, productId, packagingOptionId = null) => {
    const cart = await Cart.findOne({ customer: customerId });
    if (!cart) throw new Error('Cart not found');

    const optionKey = packagingOptionId ? packagingOptionId.toString() : null;

    cart.items = cart.items.filter((item) => {
        if (item.product.toString() !== productId) return true;
        // If optionKey given, only remove matching option; otherwise remove all for product
        if (optionKey) return item.packagingOptionId?.toString() !== optionKey;
        return false;
    });

    await cart.save();
    return cart;
};
