# API Specification

## Endpoints

### GET /api/users
Returns a list of all users

### GET /api/users/:id
Returns a specific user by ID

### POST /api/users
Creates a new user

### PUT /api/users/:id
Updates an existing user

### DELETE /api/users/:id
Deletes a user

## Authentication
All endpoints require Bearer token authentication.

## Error Handling
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error
