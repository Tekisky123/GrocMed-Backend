# Category & Search API Documentation

## 1. Search API

### Search Products
**Endpoint:** `GET /api/product/search`
**Access:** Public
**Description:** Search products by name, brand, description, or filter by category. Support partial matching (Regex).

**Query Parameters:**
- `query` (Optional): Text to search in name, brand, or description.
- `category` (Optional): Filter by category name (case-insensitive).

**Examples:**
- `/api/product/search?query=apple` (Search for "apple")
- `/api/product/search?category=Fruits` (All products in "Fruits")
- `/api/product/search?query=red&category=Fruits` (Search for "red" within "Fruits")

**Success Response (200):**
```json
{
  "success": true,
  "message": "Products found successfully",
  "count": 5,
  "data": [
    {
      "_id": "...",
      "name": "Red Apple",
      "category": "Fruits",
      "price": 100,
      "images": ["url1"]
    }
  ]
}
```

---

## 2. Category API

### Get All Categories
**Endpoint:** `GET /api/category/getAllCategories`
**Access:** Public
**Description:** Returns a list of all unique categories present in the active products. For each category, it provides one representative image (taken from the first product found in that category).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "count": 3,
  "data": [
    {
      "name": "Fruits",
      "image": "https://s3-url.com/apple.jpg",
      "productCount": 10
    },
    {
      "name": "Vegetables",
      "image": "https://s3-url.com/carrot.jpg",
      "productCount": 5
    }
  ]
}
```

### Get Products by Category
**Endpoint:** `GET /api/category/getProductsByCategory/:category`
**Access:** Public
**Description:** Retrieve all active products belonging to a specific category.

**Path Parameters:**
- `category`: Name of the category (e.g., "Fruits"). Case-insensitive.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Products for category 'Fruits' retrieved successfully",
  "count": 10,
  "data": [
    {
      "_id": "...",
      "name": "Banana",
      "category": "Fruits",
      "price": 40,
      "images": ["url"]
    }
    // ... more products
  ]
}
```
