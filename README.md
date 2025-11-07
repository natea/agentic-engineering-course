# JWT Authentication System

A production-ready JWT authentication system built with Express, TypeScript, and Prisma. This project demonstrates essential authentication concepts including password hashing, token management, and rate limiting.

## Features

- **User Registration** - Create new user accounts with email/password
- **User Login** - Authenticate existing users
- **Token Refresh** - Exchange refresh tokens for new access tokens
- **Password Security** - Bcrypt hashing with 10 salt rounds
- **JWT Tokens** - Industry-standard token-based authentication
- **Rate Limiting** - Protection against brute force attacks (5 req/min)
- **TypeScript** - Full type safety throughout the application
- **SQLite Database** - Lightweight, zero-configuration database
- **Comprehensive Tests** - Integration tests for all endpoints

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong JWT secret:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=3000
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## API Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Refresh Access Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Project Structure

```
├── src/
│   ├── index.ts              # Express server setup
│   ├── routes/
│   │   └── auth.ts           # Authentication endpoints
│   ├── services/
│   │   └── authService.ts    # Business logic
│   ├── middleware/
│   │   └── rateLimiter.ts    # Rate limiting
│   ├── utils/
│   │   ├── jwt.ts            # JWT utilities
│   │   └── validation.ts     # Input validation
│   └── types/
│       └── auth.ts           # TypeScript types
├── tests/
│   ├── auth.test.ts          # Integration tests
│   ├── services/
│   │   └── authService.test.ts
│   └── utils/
│       └── jwt.test.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database file path | `file:./dev.db` |
| `JWT_SECRET` | Secret key for signing JWTs | (required) |
| `JWT_ACCESS_EXPIRY` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration | `7d` |
| `PORT` | Server port | `3000` |

## Security Best Practices

### Password Hashing
- Uses bcrypt with 10 salt rounds
- Never stores plaintext passwords
- Passwords must be minimum 6 characters

### Token Management
- **Access Tokens:** Short-lived (15 minutes) for API authentication
- **Refresh Tokens:** Long-lived (7 days) for obtaining new access tokens
- Tokens signed with HS256 algorithm

### Rate Limiting
- 5 requests per minute per IP address
- Prevents brute force attacks
- Returns HTTP 429 when limit exceeded

### Error Messages
- Generic "Invalid credentials" message (doesn't reveal if email exists)
- No stack traces in production
- Server-side error logging for debugging

### Input Validation
- Email format validation (regex)
- Password length validation
- Type checking with TypeScript

## Teaching Points

This project demonstrates:

1. **Token-Based Authentication**
   - Access vs refresh token pattern
   - JWT structure and validation
   - Token expiration handling

2. **Security Fundamentals**
   - Password hashing with bcrypt
   - Rate limiting to prevent abuse
   - Generic error messages
   - Environment-based secrets

3. **Clean Architecture**
   - Separation of concerns (routes/services/middleware)
   - Service-oriented design
   - TypeScript type safety

4. **Testing Best Practices**
   - Integration testing with Supertest
   - Test isolation with fresh database
   - Coverage of happy paths and edge cases

## Possible Enhancements

Students can extend this system to learn more:

- **Token Revocation** - Store refresh tokens in database
- **Email Verification** - Send confirmation emails
- **Password Reset** - Forgot password flow
- **User Profiles** - Profile management endpoints
- **Role-Based Access Control** - User roles and permissions
- **OAuth Integration** - Social login (Google, GitHub)
- **Stronger Validation** - Use Zod or Joi schemas
- **Audit Logging** - Track login attempts
- **Two-Factor Authentication** - TOTP implementation

## License

MIT
