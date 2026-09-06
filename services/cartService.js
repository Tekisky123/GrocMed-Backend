import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';

export const addToCartService = async (customerId, productId, quantity, packagingOptionId = null) => {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Determine price and minQty based on packaging option
    let price;
    let minimumQty;
    let packagingLabel = null;
    let unitsPerPack = product.unitsPerUnitType || 1;

    // Auto-default packagingOptionId if product has packagingOptions but option is unspecified
    if (!packagingOptionId && product.packagingOptions?.length > 0) {
        packagingOptionId = product.packagingOptions[0]._id.toString();
    }

    if (packagingOptionId && product.packagingOptions?.length > 0) {
        const option = product.packagingOptions.find(
            (o) => o._id.toString() === packagingOptionId.toString()
        );
        if (!option) throw new Error('Packaging option not found');

        price = option.salePrice;
        minimumQty = option.minQty || 1;
        packagingLabel = option.label;
        unitsPerPack = option.unitsPerPack || 1;
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
            (item) => {
                const itemProdId = item.product?._id ? item.product._id.toString() : item.product.toString();
                const itemOptKey = item.packagingOptionId ? item.packagingOptionId.toString() : 'default';
                return itemProdId === productId && itemOptKey === optionKey;
            }
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
                cart.items[itemIndex].packagingLabel = packagingLabel;
                cart.items[itemIndex].unitsPerPack = unitsPerPack;
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
                unitsPerPack,
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
                unitsPerPack,
            }],
        });
    }

    // Deduplicate cart items for safety
    const mergedMap = new Map();
    cart.items.forEach(item => {
        const pId = item.product?._id ? item.product._id.toString() : item.product.toString();
        const optKey = item.packagingOptionId ? item.packagingOptionId.toString() : 'default';
        const key = `${pId}_${optKey}`;
        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            existing.quantity += item.quantity;
        } else {
            mergedMap.set(key, item);
        }
    });
    cart.items = Array.from(mergedMap.values());

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

    // Deduplicate items in retrieved cart if needed
    if (cart.items && cart.items.length > 0) {
        const mergedMap = new Map();
        let hasDuplicates = false;
        cart.items.forEach(item => {
            if (!item.product) return;
            const pId = item.product._id ? item.product._id.toString() : item.product.toString();
            const optKey = item.packagingOptionId ? item.packagingOptionId.toString() : 'default';
            const key = `${pId}_${optKey}`;
            if (mergedMap.has(key)) {
                hasDuplicates = true;
                const existing = mergedMap.get(key);
                existing.quantity += item.quantity;
            } else {
                mergedMap.set(key, item);
            }
        });

        if (hasDuplicates) {
            cart.items = Array.from(mergedMap.values());
            await cart.save();
        }
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

export const clearCartService = async (customerId) => {
    let cart = await Cart.findOne({ customer: customerId });
    if (!cart) {
        return { items: [], totalAmount: 0 };
    }
    cart.items = [];
    await cart.save();
    return cart;
};
