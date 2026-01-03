# Admin Customer Management API Documentation

## Overview
APIs for Admins to manage customer data, including searching and retrieving detailed profiles.

**Base URL:** `/api/customer` (Note: These are admin-specific endpoints on the customer router)
**Authentication:** Required (Admin Token)

---

### 1. Get All Customers
**Endpoint:** `GET /getAllCustomers`
**Description:** Retrieve a list of all registered customers.
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "653...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "addresses": [...],
      "isActive": true
    }
  ]
}
```

---

### 2. Search Customers
**Endpoint:** `GET /search`
**Query Parameters:** `?query=<term>`
**Description:** Search customers by Name, Email, or Phone.
**Example:** `/api/customer/search?query=John`

---

### 3. Get Customer Details
**Endpoint:** `GET /getCustomerById/:id`
**Description:** Retrieve full profile of a specific customer.

---

### 4. Delete Customer
**Endpoint:** `DELETE /deleteCustomer/:id`
**Description:** Delete a customer account.
