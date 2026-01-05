import { generateSalesReportService } from '../services/reportService.js';

/**
 * Download sales report in Excel format
 * Generates a comprehensive multi-sheet Excel workbook and streams it to the client
 */
export const downloadSalesReport = async (req, res, next) => {
    try {
        // Generate the Excel workbook
        const workbook = await generateSalesReportService();

        // Set response headers for file download
        const filename = `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write workbook to response stream
        await workbook.xlsx.write(res);

        // End the response
        res.end();
    } catch (error) {
        next(error);
    }
};
