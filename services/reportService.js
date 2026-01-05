import ExcelJS from 'exceljs';
import Order from '../model/orderModel.js';
import Customer from '../model/customerModel.js';
import Product from '../model/productModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';

/**
 * Generate comprehensive sales report in Excel format
 * Creates a multi-sheet workbook with orders, revenue, products, customers, delivery partners, and sales analytics
 */
export const generateSalesReportService = async () => {
    try {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'GrocMed Admin';
        workbook.created = new Date();

        // Fetch all data in parallel for better performance
        const [orders, customers, products, deliveryPartners] = await Promise.all([
            Order.find({}).populate('customer', 'name phone email').populate('deliveryPartner', 'name').sort({ createdAt: -1 }),
            Customer.find({}).sort({ createdAt: -1 }),
            Product.find({}).sort({ createdAt: -1 }),
            DeliveryPartner.find({}).sort({ createdAt: -1 })
        ]);

        // ===== SHEET 1: ORDERS =====
        const ordersSheet = workbook.addWorksheet('Orders', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        // Define columns
        ordersSheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Order Date', key: 'orderDate', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Total Amount (₹)', key: 'totalAmount', width: 18 },
            { header: 'Items Count', key: 'itemsCount', width: 12 },
            { header: 'Delivery Partner', key: 'deliveryPartner', width: 25 },
        ];

        // Style header row
        ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ordersSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        ordersSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data
        orders.forEach(order => {
            ordersSheet.addRow({
                orderId: order._id.toString(),
                customerName: order.customer?.name || 'N/A',
                phone: order.customer?.phone || 'N/A',
                email: order.customer?.email || 'N/A',
                orderDate: order.createdAt,
                status: order.orderStatus,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
                itemsCount: order.items.length,
                deliveryPartner: order.deliveryPartner?.name || 'Not Assigned'
            });
        });

        // Format date and currency columns
        ordersSheet.getColumn('orderDate').numFmt = 'dd-mmm-yyyy hh:mm AM/PM';
        ordersSheet.getColumn('totalAmount').numFmt = '₹#,##0.00';

        // ===== SHEET 2: REVENUE SUMMARY =====
        const revenueSheet = workbook.addWorksheet('Revenue Summary');

        // Calculate revenue metrics
        const totalRevenue = orders.filter(o => o.orderStatus !== 'Cancelled').reduce((sum, o) => sum + o.totalAmount, 0);
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(o => o.orderStatus === 'Delivered').length;
        const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled').length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const codOrders = orders.filter(o => o.paymentMethod === 'COD').length;
        const onlineOrders = orders.filter(o => o.paymentMethod === 'Online').length;
        const codRevenue = orders.filter(o => o.paymentMethod === 'COD' && o.orderStatus !== 'Cancelled').reduce((sum, o) => sum + o.totalAmount, 0);
        const onlineRevenue = orders.filter(o => o.paymentMethod === 'Online' && o.orderStatus !== 'Cancelled').reduce((sum, o) => sum + o.totalAmount, 0);

        // Add summary data
        revenueSheet.addRow(['REVENUE SUMMARY REPORT']);
        revenueSheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
        revenueSheet.addRow([]);

        revenueSheet.addRow(['Metric', 'Value']);
        revenueSheet.getRow(3).font = { bold: true };
        revenueSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

        const summaryData = [
            ['Total Revenue (Excl. Cancelled)', `₹${totalRevenue.toFixed(2)}`],
            ['Total Orders', totalOrders],
            ['Delivered Orders', deliveredOrders],
            ['Cancelled Orders', cancelledOrders],
            ['Average Order Value', `₹${avgOrderValue.toFixed(2)}`],
            [],
            ['Payment Method Breakdown', ''],
            ['COD Orders', codOrders],
            ['Online Orders', onlineOrders],
            ['COD Revenue', `₹${codRevenue.toFixed(2)}`],
            ['Online Revenue', `₹${onlineRevenue.toFixed(2)}`],
        ];

        summaryData.forEach(row => revenueSheet.addRow(row));

        revenueSheet.getColumn(1).width = 35;
        revenueSheet.getColumn(2).width = 25;
        revenueSheet.getColumn(2).alignment = { horizontal: 'right' };

        // ===== SHEET 3: PRODUCTS =====
        const productsSheet = workbook.addWorksheet('Products', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        productsSheet.columns = [
            { header: 'Product ID', key: 'productId', width: 20 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Brand', key: 'brand', width: 20 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'MRP (₹)', key: 'mrp', width: 12 },
            { header: 'Offer Price (₹)', key: 'offerPrice', width: 15 },
            { header: 'Stock', key: 'stock', width: 10 },
            { header: 'Unit Type', key: 'unitType', width: 15 },
            { header: 'Weight/Volume', key: 'weightVolume', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // Style header
        productsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        productsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        productsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add product data
        products.forEach(product => {
            productsSheet.addRow({
                productId: product._id.toString(),
                name: product.name,
                brand: product.brand,
                category: product.category,
                mrp: product.mrp,
                offerPrice: product.offerPrice,
                stock: product.stock,
                unitType: product.unitType,
                weightVolume: product.perUnitWeightVolume,
                status: product.isActive ? 'Active' : 'Inactive'
            });
        });

        productsSheet.getColumn('mrp').numFmt = '₹#,##0.00';
        productsSheet.getColumn('offerPrice').numFmt = '₹#,##0.00';

        // ===== SHEET 4: CUSTOMERS =====
        const customersSheet = workbook.addWorksheet('Customers', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        customersSheet.columns = [
            { header: 'Customer ID', key: 'customerId', width: 20 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Registration Date', key: 'regDate', width: 20 },
            { header: 'Total Orders', key: 'totalOrders', width: 12 },
            { header: 'Total Spent (₹)', key: 'totalSpent', width: 15 },
            { header: 'Addresses', key: 'addresses', width: 10 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // Style header
        customersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        customersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
        customersSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Calculate customer metrics
        customers.forEach(customer => {
            const customerOrders = orders.filter(o => o.customer?._id?.toString() === customer._id.toString());
            const totalSpent = customerOrders.filter(o => o.orderStatus !== 'Cancelled').reduce((sum, o) => sum + o.totalAmount, 0);

            customersSheet.addRow({
                customerId: customer._id.toString(),
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                regDate: customer.createdAt,
                totalOrders: customerOrders.length,
                totalSpent: totalSpent,
                addresses: customer.addresses?.length || 0,
                status: customer.isActive ? 'Active' : 'Inactive'
            });
        });

        customersSheet.getColumn('regDate').numFmt = 'dd-mmm-yyyy';
        customersSheet.getColumn('totalSpent').numFmt = '₹#,##0.00';

        // ===== SHEET 5: DELIVERY PARTNERS =====
        const deliverySheet = workbook.addWorksheet('Delivery Partners', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        deliverySheet.columns = [
            { header: 'Partner ID', key: 'partnerId', width: 20 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Vehicle Type', key: 'vehicleType', width: 15 },
            { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
            { header: 'License Number', key: 'licenseNumber', width: 18 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Active', key: 'isActive', width: 10 },
        ];

        // Style header
        deliverySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        deliverySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
        deliverySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add delivery partner data
        deliveryPartners.forEach(partner => {
            deliverySheet.addRow({
                partnerId: partner._id.toString(),
                name: partner.name,
                email: partner.email,
                phone: partner.phone,
                vehicleType: partner.vehicleType,
                vehicleNumber: partner.vehicleNumber,
                licenseNumber: partner.licenseNumber,
                status: partner.status,
                isActive: partner.isActive ? 'Yes' : 'No'
            });
        });

        // ===== SHEET 6: DATE-WISE SALES =====
        const salesSheet = workbook.addWorksheet('Date-wise Sales', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        salesSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Orders Count', key: 'ordersCount', width: 15 },
            { header: 'Revenue (₹)', key: 'revenue', width: 18 },
            { header: 'Avg Order Value (₹)', key: 'avgOrderValue', width: 20 },
        ];

        // Style header
        salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
        salesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Group orders by date
        const salesByDate = {};
        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            if (!salesByDate[dateKey]) {
                salesByDate[dateKey] = { orders: [], revenue: 0 };
            }
            salesByDate[dateKey].orders.push(order);
            if (order.orderStatus !== 'Cancelled') {
                salesByDate[dateKey].revenue += order.totalAmount;
            }
        });

        // Add date-wise data
        Object.keys(salesByDate).sort().reverse().forEach(date => {
            const data = salesByDate[date];
            const avgValue = data.orders.length > 0 ? data.revenue / data.orders.length : 0;

            salesSheet.addRow({
                date: new Date(date),
                ordersCount: data.orders.length,
                revenue: data.revenue,
                avgOrderValue: avgValue
            });
        });

        salesSheet.getColumn('date').numFmt = 'dd-mmm-yyyy';
        salesSheet.getColumn('revenue').numFmt = '₹#,##0.00';
        salesSheet.getColumn('avgOrderValue').numFmt = '₹#,##0.00';

        return workbook;
    } catch (error) {
        throw new Error(`Failed to generate sales report: ${error.message}`);
    }
};
