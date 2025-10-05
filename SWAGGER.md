# Swagger/OpenAPI Documentation

## Accessing the Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## Authentication

Most endpoints require authentication. To test authenticated endpoints:

1. **Get a token** by calling `POST /api/auth`:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePass123!",
     "name": "John Doe"
   }
   ```

2. **Copy the `IdToken`** from the response

3. **Click "Authorize"** button in Swagger UI

4. **Enter** the token in the format: `Bearer YOUR_ID_TOKEN`

5. **Click "Authorize"** and close the dialog

Now all authenticated endpoints will work!

## Available Endpoints

### Authentication
- `POST /api/auth` - Sign in or register (no authentication required)

### Account Management
- `GET /api/account/me` - Get current user profile (requires authentication)
- `PUT /api/account/edit` - Edit user profile (requires authentication)
  - Regular users: can only edit their own name
  - Admins: can edit name and role of any user

## Roles

- **user**: Regular user with limited permissions
- **admin**: Administrator with full permissions

## Testing Tips

1. First register/login to get tokens
2. Use the `IdToken` (not `AccessToken`) for API calls
3. Admin features require your user to be in the 'admin' group in Cognito
4. Check the response schemas in Swagger for detailed field information
