import Order from '../model/orderModel.js';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';

/**
 * Get comprehensive dashboard statistics
 * Includes: total orders, revenue, customers, delivery partners, and sales performance
 */
export const getDashboardStatsService = async () => {
    try {
        // Calculate date range for sales performance (last 7 days)
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // Last 7 days including today
        sevenDaysAgo.setHours(0, 0, 0, 0); // Start of that day

        // Parallel queries for better performance
        const [
            totalOrders,
            revenueData,
            totalCustomers,
            totalDeliveryPartners,
            salesPerformance
        ] = await Promise.all([
            // Total orders count
            Order.countDocuments(),

            // Total revenue (excluding cancelled orders)
            Order.aggregate([
                {
                    $match: {
                        orderStatus: { $ne: 'Cancelled' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' }
                    }
                }
            ]),

            // Total active customers
            Customer.countDocuments({ isActive: true }),

            // Total active delivery partners
            DeliveryPartner.countDocuments({ isActive: true }),

            // Sales performance for last 7 days
            Order.aggregate([
                {
                    $match: {
                        orderStatus: { $ne: 'Cancelled' },
                        createdAt: { $gte: sevenDaysAgo, $lte: today }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        revenue: 1,
                        orders: 1
                    }
                }
            ])
        ]);

        // Extract total revenue (default to 0 if no orders)
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Fill in missing dates with zero values for complete 7-day chart
        const salesPerformanceMap = new Map(
            salesPerformance.map(item => [item.date, item])
        );

        const completeSalesPerformance = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            completeSalesPerformance.push({
                date: dateString,
                revenue: salesPerformanceMap.get(dateString)?.revenue || 0,
                orders: salesPerformanceMap.get(dateString)?.orders || 0
            });
        }

        return {
            totalOrders,
            totalRevenue: Math.round(totalRevenue), // Round to nearest integer
            totalCustomers,
            totalDeliveryPartners,
            salesPerformance: completeSalesPerformance
        };
    } catch (error) {
        throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
};
