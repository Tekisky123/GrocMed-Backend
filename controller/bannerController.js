import Banner from '../model/bannerModel.js';
import { cacheService } from '../utils/cacheService.js';

export const getBanners = async (req, res, next) => {
    try {
        const cached = cacheService.get('banners_public');
        if (cached) {
            return res.status(200).json({
                success: true,
                data: cached,
            });
        }

        const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 }).lean();
        cacheService.set('banners_public', banners, 120);

        res.status(200).json({
            success: true,
            data: banners,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllBannersAdmin = async (req, res, next) => {
    try {
        const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        res.status(200).json({
            success: true,
            data: banners,
        });
    } catch (error) {
        next(error);
    }
};

export const createBanner = async (req, res, next) => {
    try {
        const banner = new Banner(req.body);
        const savedBanner = await banner.save();
        cacheService.clearPattern('banners');
        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            data: savedBanner,
        });
    } catch (error) {
        next(error);
    }
};

export const updateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedBanner = await Banner.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        }).lean();
        if (!updatedBanner) throw new Error('Banner not found');
        cacheService.clearPattern('banners');
        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            data: updatedBanner,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deletedBanner = await Banner.findByIdAndDelete(id);
        if (!deletedBanner) throw new Error('Banner not found');
        cacheService.clearPattern('banners');
        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
