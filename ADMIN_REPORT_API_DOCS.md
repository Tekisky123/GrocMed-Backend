# Admin Sales Report API Documentation

## Overview
The Admin Sales Report API generates comprehensive Excel reports containing complete sales data across multiple sheets including orders, revenue summary, products, customers, delivery partners, and date-wise sales analytics.

## Base URL
```
http://localhost:3000/api/admin/report
```

## Authentication
All report endpoints require admin authentication via Bearer token.

**Header:**
```
Authorization: Bearer <admin_token>
```

---

## Endpoints

### Download Sales Report

Generates and downloads a comprehensive sales report in Excel format with multiple sheets.

**Endpoint:** `GET /sales`

**Authentication:** Required (Admin)

**Response Format:** Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

**File Structure:**

The generated Excel file contains 6 sheets:

#### Sheet 1: Orders
Complete order details including:
- Order ID
- Customer Name, Phone, Email
- Order Date
- Status (Placed, Packed, Shipped, Out for Delivery, Delivered, Cancelled)
- Payment Method (COD, Online)
- Payment Status
- Total Amount (₹)
- Items Count
- Delivery Partner

#### Sheet 2: Revenue Summary
Financial overview with:
- Total Revenue (excluding cancelled orders)
- Total Orders
- Delivered Orders
- Cancelled Orders
- Average Order Value
- Payment Method Breakdown (COD vs Online)
- Revenue by Payment Method

#### Sheet 3: Products
Product inventory and details:
- Product ID
- Name
- Brand
- Category
- MRP (₹)
- Offer Price (₹)
- Stock Level
- Unit Type
- Weight/Volume
- Status (Active/Inactive)

#### Sheet 4: Customers
Customer database with:
- Customer ID
- Name
- Email
- Phone
- Registration Date
- Total Orders
- Total Spent (₹)
- Number of Addresses
- Status (Active/Inactive)

#### Sheet 5: Delivery Partners
Delivery team information:
- Partner ID
- Name
- Email
- Phone
- Vehicle Type
- Vehicle Number
- License Number
- Current Status
- Active Status

#### Sheet 6: Date-wise Sales
Daily sales analytics:
- Date
- Orders Count
- Revenue (₹)
- Average Order Value (₹)

**Styling Features:**
- Color-coded header rows for each sheet
- Bold headers with white text
- Auto-fit column widths
- Currency formatting (₹) for monetary values
- Date formatting (dd-mmm-yyyy)
- Frozen header rows for easy scrolling

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/admin/report/sales \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --output sales_report.xlsx
```

**Success Response (200 OK):**
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Content-Disposition: attachment; filename="Sales_Report_YYYY-MM-DD.xlsx"
- Binary Excel file data

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to generate sales report: <error details>"
}
```

---

## Frontend Integration

### API Client (TypeScript)

```typescript
// dashboardApi.ts
export const dashboardApi = {
    downloadSalesReport: async () => {
        const response = await axiosInstance.get("/api/admin/report/sales", {
            responseType: 'blob',
        });
        return response.data;
    },
};
```

### Download Handler

```typescript
const handleDownloadReport = async () => {
    try {
        setIsDownloading(true);
        toast.info('Generating report...');
        
        const blob = await dashboardApi.downloadSalesReport();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Report downloaded successfully!');
    } catch (error) {
        toast.error('Failed to download report');
    } finally {
        setIsDownloading(false);
    }
};
```

---

## Implementation Details

### Backend Technology
- **Library:** ExcelJS v4.x
- **Streaming:** Direct stream to response (no temp files)
- **Memory:** Optimized for large datasets

### Data Processing
1. **Parallel Queries:** All data fetched concurrently using `Promise.all()`
2. **Aggregations:** Revenue calculations exclude cancelled orders
3. **Customer Metrics:** Total orders and spent calculated per customer
4. **Date Grouping:** Sales aggregated by date for analytics

### Performance Considerations
- **Response Time:** Typically 2-5 seconds for 1000+ orders
- **File Size:** ~50KB for 100 orders, ~500KB for 1000 orders
- **Memory Usage:** Streaming prevents memory overflow
- **Concurrent Requests:** Supported (each generates independently)

### Data Accuracy
- Revenue excludes cancelled orders
- Only active customers/partners counted in summaries
- Dates in UTC timezone
- Currency formatted with ₹ symbol
- All calculations use precise decimal arithmetic

---

## Testing

### Manual Testing
1. Login to admin panel
2. Navigate to Dashboard
3. Click "Download Report" button
4. Verify file downloads with correct filename
5. Open Excel file and check all 6 sheets
6. Validate data accuracy against database

### Automated Testing
```bash
# Test API endpoint
curl -X GET http://localhost:3000/api/admin/report/sales \
  -H "Authorization: Bearer <token>" \
  --output test_report.xlsx

# Verify file is valid Excel
file test_report.xlsx
# Expected: Microsoft Excel 2007+
```

---

## Troubleshooting

### Common Issues

**Issue:** File downloads but won't open
- **Cause:** Incorrect Content-Type header
- **Solution:** Verify response headers are set correctly

**Issue:** Slow generation time
- **Cause:** Large dataset or slow database queries
- **Solution:** Add database indexes on createdAt, orderStatus, isActive fields

**Issue:** Memory errors
- **Cause:** Very large datasets (10,000+ orders)
- **Solution:** Implement pagination or date range filtering

**Issue:** Missing data in sheets
- **Cause:** Database query errors or missing relationships
- **Solution:** Check populate() calls and database relationships
