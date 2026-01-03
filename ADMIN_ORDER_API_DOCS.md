# Admin Order API Documentation

## Overview
These APIs allow Admins to manage orders, including viewing all orders, searching, and updating order status.

**Base URL:** `/api/admin/order`
**Authentication:** Required (Admin Token)

---

### 1. Get All Orders
**Endpoint:** `GET /getAllOrders`
**Description:** Retrieve all orders sorted by newest first.
**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "653...",
      "customer": {
        "name": "John Doe",
        "phone": "9876543210"
      },
      "totalAmount": 500,
      "orderStatus": "Placed",
      "createdAt": "..."
    }
  ]
}
```

---

### 2. Search Orders
**Endpoint:** `GET /search`
**Query Parameters:** `?query=<search_term>`
**Description:** Search orders by:
- Order ID (full ID)
- Customer Name (partial match)
- Customer Phone (partial match)

**Example:** `/api/admin/order/search?query=John`

---

### 3. Get Order Details
**Endpoint:** `GET /getOrderById/:id`
**Description:** Get full details of a specific order.

---

### 4. Update Order Status & Send Notification
**Endpoint:** `PUT /updateStatus/:id`
**Description:** Update the status of an order. **This triggers a Push Notification to the Customer.**
**Body:**
```json
{
  "status": "Shipped"
}
```
**Valid Statuses:** `Placed`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`

**Effect:**
- Updates `orderStatus`.
- Adds entry to `trackingHistory`.
- Sends FCM Notification to Customer if they have a registered device.
