# Phase 4: Backend API - CRUD Endpoints Documentation

## Overview

Phase 4 implements complete CRUD (Create, Read, Update, Delete) operations for cards and tags. All endpoints require authentication via JWT token in the Authorization header.

---

## Authentication

All endpoints (except `/auth/*`) require the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT token is obtained from `/auth/signup` or `/auth/signin` responses.

---

## Base URL

```
http://localhost:5000
```

---

## Card Endpoints

### 1. Get All Cards (Paginated)

```
GET /cards?page=1&limit=20
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Response (200):**
```json
{
  "cards": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "My First Card",
      "content_type": "url",
      "raw_content": "https://example.com",
      "extracted_text": "Example content...",
      "metadata": { "og:image": "..." },
      "created_at": "2026-04-21T10:00:00Z",
      "updated_at": "2026-04-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 2. Create Card

```
POST /cards
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "My First Card",
  "content_type": "url",
  "raw_content": "https://example.com",
  "extracted_text": "Card content here",
  "metadata": {
    "og:title": "Example",
    "og:image": "..."
  },
  "tags": ["learning", "tech"]
}
```

**Validation:**
- `title` (required): 1-500 characters
- `content_type` (required): One of: `social_link`, `pdf`, `docx`, `text`, `url`, `article`
- `raw_content` (optional): Original URL or file path
- `extracted_text` (optional): Clean text for search
- `metadata` (optional): JSON object
- `tags` (optional): Array of tag names (auto-creates tags if they don't exist)

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "My First Card",
  "content_type": "url",
  "raw_content": "https://example.com",
  "extracted_text": "Card content here",
  "metadata": { "og:title": "Example" },
  "created_at": "2026-04-21T10:00:00Z",
  "updated_at": "2026-04-21T10:00:00Z"
}
```

**Errors:**
- `400`: Validation failed
- `401`: Unauthorized

---

### 3. Get Single Card

```
GET /cards/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "My Card",
  "content_type": "url",
  "raw_content": "https://example.com",
  "extracted_text": "Content...",
  "metadata": {},
  "created_at": "2026-04-21T10:00:00Z",
  "updated_at": "2026-04-21T10:00:00Z"
}
```

**Errors:**
- `404`: Card not found
- `401`: Unauthorized

---

### 4. Update Card

```
PUT /cards/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (all optional):**
```json
{
  "title": "Updated Title",
  "raw_content": "https://new-url.com",
  "extracted_text": "Updated content",
  "metadata": { "updated": true }
}
```

**Validation:**
- `title` (optional): 1-500 characters
- `raw_content` (optional): String
- `extracted_text` (optional): String
- `metadata` (optional): JSON object
- Cannot update `content_type`

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "updated_at": "2026-04-21T11:00:00Z"
}
```

**Errors:**
- `400`: Validation failed or no fields provided
- `404`: Card not found
- `401`: Unauthorized

---

### 5. Delete Card

```
DELETE /cards/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204):**
No content

**Errors:**
- `404`: Card not found
- `401`: Unauthorized

---

### 6. Get Card Tags

```
GET /cards/:id/tags
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "tags": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "learning",
      "created_at": "2026-04-21T10:00:00Z"
    }
  ]
}
```

**Errors:**
- `404`: Card not found
- `401`: Unauthorized

---

### 7. Add Tags to Card

```
POST /cards/:id/tags
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tags": ["learning", "tech", "new-tag"]
}
```

**Behavior:**
- Creates new tags if they don't exist
- Ignores duplicate tag associations (no error)
- All tags are created under the authenticated user

**Response (200):**
```json
{
  "tags": [
    {
      "id": "uuid",
      "name": "learning",
      "created_at": "2026-04-21T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "tech",
      "created_at": "2026-04-21T10:00:00Z"
    }
  ]
}
```

**Errors:**
- `400`: Tags not provided or invalid format
- `404`: Card not found
- `401`: Unauthorized

---

### 8. Remove Tag from Card

```
DELETE /cards/:id/tags/:tagId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204):**
No content

**Errors:**
- `404`: Card or tag not found
- `401`: Unauthorized

---

## Tag Endpoints

### 1. Get All Tags

```
GET /tags
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "tags": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "learning",
      "created_at": "2026-04-21T10:00:00Z",
      "cardCount": 5
    },
    {
      "id": "uuid",
      "name": "tech",
      "created_at": "2026-04-21T10:00:00Z",
      "cardCount": 3
    }
  ]
}
```

**Sorted:** Alphabetically by tag name

---

### 2. Create Tag

```
POST /tags
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "learning"
}
```

**Validation:**
- `name` (required): 1-100 characters
- Must be unique per user (case-sensitive)

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "learning",
  "created_at": "2026-04-21T10:00:00Z"
}
```

**Errors:**
- `400`: Validation failed
- `409`: Tag already exists
- `401`: Unauthorized

---

### 3. Get Single Tag

```
GET /tags/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "learning",
  "created_at": "2026-04-21T10:00:00Z",
  "cardCount": 5
}
```

**Errors:**
- `404`: Tag not found
- `401`: Unauthorized

---

### 4. Delete Tag

```
DELETE /tags/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Behavior:**
- Deletes tag and removes all card-tag associations
- Does NOT delete the cards themselves

**Response (204):**
No content

**Errors:**
- `404`: Tag not found
- `401`: Unauthorized

---

## Content Types

Supported `content_type` values:

| Type | Usage |
|------|-------|
| `social_link` | Twitter, YouTube, LinkedIn, etc. |
| `pdf` | PDF documents |
| `docx` | Microsoft Word documents |
| `text` | Plain text |
| `url` | Web URLs/articles |
| `article` | Longer-form articles |

---

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Validation error description"
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Missing or invalid authorization header"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Card not found"
}
```

### 409 Conflict
```json
{
  "code": 409,
  "message": "Tag 'learning' already exists"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```

---

## Usage Examples

### Create Card with Tags

```bash
curl -X POST http://localhost:5000/cards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn TypeScript",
    "content_type": "url",
    "raw_content": "https://www.typescriptlang.org",
    "extracted_text": "TypeScript is a typed superset of JavaScript",
    "tags": ["programming", "learning"]
  }'
```

### Get Cards with Pagination

```bash
curl "http://localhost:5000/cards?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Filter by Tag (using card tags)

```bash
# Get all cards, then filter by tag on client side
# or use Search API in later phases for server-side filtering
curl "http://localhost:5000/cards" \
  -H "Authorization: Bearer <token>"
```

### Update Card Title

```bash
curl -X PUT http://localhost:5000/cards/<card-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title"}'
```

### Delete Card

```bash
curl -X DELETE http://localhost:5000/cards/<card-id> \
  -H "Authorization: Bearer <token>"
```

### Add Tags to Card

```bash
curl -X POST http://localhost:5000/cards/<card-id>/tags \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["important", "review"]}'
```

---

## Phase 4 Summary

**Endpoints Implemented:** 12  
**Card Operations:** 8  
**Tag Operations:** 4  
**Authentication:** JWT Required  
**Database Queries:** Optimized with indexes  
**Error Handling:** Comprehensive validation  

**Next Phase (5):** Frontend setup with card display and management UI

---

**API Version:** 1.0  
**Phase:** 4  
**Status:** ✅ Complete
