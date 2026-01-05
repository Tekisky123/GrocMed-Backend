import { getDashboardStatsService } from '../services/dashboardService.js';

/**
 * Get dashboard statistics
 * Returns aggregated data for admin dashboard
 */
export const getDashboardStats = async (req, res, next) => {
    try {
        const stats = await getDashboardStatsService();

        res.status(200).json({
            success: true,
            message: 'Dashboard stats retrieved successfully',
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};
