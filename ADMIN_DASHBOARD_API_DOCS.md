# Admin Dashboard API Documentation

## Overview
The Admin Dashboard API provides aggregated statistics and metrics for the admin panel dashboard, including total orders, revenue, customers, delivery partners, and sales performance data.

## Base URL
```
http://localhost:3000/api/admin/dashboard
```

## Authentication
All dashboard endpoints require admin authentication via Bearer token.

**Header:**
```
Authorization: Bearer <admin_token>
```

---

## Endpoints

### Get Dashboard Statistics

Retrieves comprehensive dashboard statistics including KPIs and sales performance data.

**Endpoint:** `GET /stats`

**Authentication:** Required (Admin)

**Response Format:**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "totalOrders": 1234,
    "totalRevenue": 152435,
    "totalCustomers": 456,
    "totalDeliveryPartners": 89,
    "salesPerformance": [
      {
        "date": "2026-01-01",
        "revenue": 4500,
        "orders": 12
      },
      {
        "date": "2026-01-02",
        "revenue": 3800,
        "orders": 10
      }
      // ... 7 days total
    ]
  }
}
```

**Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalOrders` | Number | Total count of all orders (including cancelled) |
| `totalRevenue` | Number | Sum of all order amounts (excluding cancelled orders) |
| `totalCustomers` | Number | Count of active customers |
| `totalDeliveryPartners` | Number | Count of active delivery partners |
| `salesPerformance` | Array | Daily sales data for the last 7 days |
| `salesPerformance[].date` | String | Date in YYYY-MM-DD format |
| `salesPerformance[].revenue` | Number | Total revenue for that day |
| `salesPerformance[].orders` | Number | Number of orders for that day |

**Sales Performance Notes:**
- Returns data for the last 7 days including today
- Days with no orders will have revenue: 0 and orders: 0
- Excludes cancelled orders from revenue calculation
- Sorted chronologically (oldest to newest)

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "totalOrders": 1234,
    "totalRevenue": 152435,
    "totalCustomers": 456,
    "totalDeliveryPartners": 89,
    "salesPerformance": [
      { "date": "2026-01-01", "revenue": 4500, "orders": 12 },
      { "date": "2026-01-02", "revenue": 3800, "orders": 10 },
      { "date": "2026-01-03", "revenue": 5200, "orders": 15 },
      { "date": "2026-01-04", "revenue": 4100, "orders": 11 },
      { "date": "2026-01-05", "revenue": 0, "orders": 0 },
      { "date": "2026-01-06", "revenue": 6300, "orders": 18 },
      { "date": "2026-01-07", "revenue": 5500, "orders": 14 }
    ]
  }
}
```

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
  "message": "Failed to fetch dashboard stats: <error details>"
}
```

---

## Implementation Details

### Database Queries
The API uses MongoDB aggregation pipelines for efficient data retrieval:

1. **Total Orders**: Simple count of all Order documents
2. **Total Revenue**: Aggregation sum of `totalAmount` excluding cancelled orders
3. **Total Customers**: Count of Customer documents where `isActive: true`
4. **Total Delivery Partners**: Count of DeliveryPartner documents where `isActive: true`
5. **Sales Performance**: Aggregation grouped by date for the last 7 days

### Performance Optimization
- All queries run in parallel using `Promise.all()`
- Indexed fields used for filtering (createdAt, orderStatus, isActive)
- Date range filtering reduces data processing

### Data Consistency
- Revenue excludes cancelled orders
- Only active customers and delivery partners are counted
- Missing dates in sales performance are filled with zero values
- All dates are in UTC timezone
