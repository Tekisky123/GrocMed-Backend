import {
    addToCartService,
    getCartService,
    removeFromCartService,
} from '../services/cartService.js';

export const addToCart = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const { productId, quantity } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required',
            });
        }

        const cart = await addToCartService(customerId, productId, parseInt(quantity));

        res.status(200).json({
            success: true,
            message: 'Item added to cart successfully',
            data: cart,
        });
    } catch (error) {
        next(error);
    }
};

export const getCart = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const cart = await getCartService(customerId);

        res.status(200).json({
            success: true,
            message: 'Cart retrieved successfully',
            data: cart,
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const { productId } = req.params;

        const cart = await removeFromCartService(customerId, productId);

        res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully',
            data: cart,
        });
    } catch (error) {
        next(error);
    }
};
