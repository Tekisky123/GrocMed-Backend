# API Documentation

## Product APIs (Public)

### 1. Get All Products
**Endpoint:** `GET /api/product/getAllProducts`
**Access:** Public
**Description:** Retrieve all active products.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "count": 2,
  "data": [
    {
      "_id": "60d5f9f5f8d5f9f5f8d5f9f5",
      "name": "Fresh Apples",
      "stock": 100,
      "isActive": true
    }
  ]
}
```

### 2. Get Product by ID
**Endpoint:** `GET /api/product/getProductById/:id`
**Access:** Public

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "60d5f9f5f8d5f9f5f8d5f9f5",
    "name": "Fresh Apples"
  }
}
```

### 3. Get Suggested Products
**Endpoint:** `GET /api/product/suggested/:id`
**Access:** Public
**Description:** Retrieve suggested products based on the category of the product ID provided. Excludes the current product.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Suggested products retrieved successfully",
  "count": 4,
  "data": [
    {
      "_id": "...",
      "name": "Another Fruit",
      "category": "Fruits",
      "price": 80
    }
  ]
}
```

---

## Customer APIs

### 1. Register Customer
**Endpoint:** `POST /api/customer/register`
**Access:** Public

**Request Body:**
```json
{
  "name": "Jane Doe",
  "phone": "9876543212",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "data": {
    "_id": "60d5f9f5f8d5f9f5f8d5f9f6",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### 2. Login Customer
**Endpoint:** `POST /api/customer/login`
**Access:** Public

**Request Body:**
```json
{
  "email": "jane@example.com", 
  "password": "securepassword"
}
```
*(Or login with phone)*

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "data": {
    "_id": "60d5f9f5f8d5f9f5f8d5f9f6",
    "name": "Jane Doe"
  }
}
```

### 3. Get Customer Profile
**Endpoint:** `GET /api/customer/profile`
**Access:** Private (Customer)
**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "60d5f9f5f8d5f9f5f8d5f9f6",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "addresses": []
  }
}
```

### 4. Update Customer Profile
**Endpoint:** `PUT /api/customer/profile`
**Access:** Private (Customer)
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "addresses": [
    {
      "street": "123 Main St",
      "city": "Metro City",
      "state": "MH",
      "zip": "400001",
      "type": "Home",
      "isDefault": true
    }
  ]
}
```

---

## Delivery Partner APIs (Admin Only)
*(See previous docs for details)*
