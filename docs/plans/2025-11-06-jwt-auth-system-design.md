# JWT Authentication System Design

**Date:** 2025-11-06
**Purpose:** Course module example demonstrating JWT authentication concepts
**Architecture:** Service-oriented Express application with TypeScript

## Overview

This authentication system teaches JWT-based authentication using a clean, service-oriented architecture. It demonstrates essential security practices (password hashing, token management, rate limiting) while remaining accessible for students learning backend development.

## Design Constraints

- **Educational Focus:** Clear code structure prioritizing learning over production complexity
- **Database:** SQLite with Prisma ORM (no external dependencies)
- **Testing:** Integration tests for key endpoints
- **Documentation:** README with curl examples
- **Validation:** Essential validation covering main security cases

## Project Structure

```
auth-system/
├── src/
│   ├── index.ts              # Express app setup & server
│   ├── routes/
│   │   └── auth.ts           # Route definitions (/register, /login, /refresh)
│   ├── services/
│   │   └── authService.ts    # Auth business logic (register, login, refresh)
│   ├── middleware/
│   │   └── rateLimiter.ts    # Rate limiting middleware
│   └── types/
│       └── auth.ts           # TypeScript types/interfaces
├── prisma/
│   ├── schema.prisma         # Database schema (User model)
│   └── migrations/           # Auto-generated migrations
├── tests/
│   └── auth.test.ts          # Integration tests for 3 endpoints
├── .env.example              # Example environment variables
├── package.json
├── tsconfig.json
└── README.md                 # Setup + API examples
```

## Technology Stack

### Core Dependencies
- **express** - Web framework
- **typescript** + **ts-node** - TypeScript support
- **prisma** + **@prisma/client** - ORM for SQLite
- **bcrypt** - Password hashing (10 rounds)
- **jsonwebtoken** - JWT creation/verification
- **express-rate-limit** - Rate limiting (5 req/min)
- **dotenv** - Environment configuration

### Development Dependencies
- **ts-node-dev** - Development server with hot reload
- **jest** + **supertest** - Testing framework
- **@types/** packages - TypeScript definitions

## Database Schema

```prisma
model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Design Decisions:**
- No refresh token storage in DB (simpler for course example)
- No token versioning (can be added as student enhancement)
- Email as unique identifier (industry standard)
- Auto-incrementing integer ID (simpler than UUIDs for teaching)

## Token Strategy

### Access Token
- **Lifespan:** 15 minutes
- **Payload:** `{ userId: number, email: string }`
- **Purpose:** Authenticate API requests
- **Storage:** Client-side (localStorage/memory)

### Refresh Token
- **Lifespan:** 7 days
- **Payload:** `{ userId: number, tokenVersion: number }`
- **Purpose:** Obtain new access tokens
- **Storage:** Client-side (httpOnly cookie in production, JSON in this example)

**Security Note:** This implementation stores tokens only in JWT (no DB persistence). This trades some security for simplicity - appropriate for learning, but production systems should consider token revocation strategies.

## API Endpoints

### POST /auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Validation:**
- Email format (regex: standard email pattern)
- Password present and minimum 6 characters

**Success Response (201):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` - Invalid email format or missing/short password
- `409` - Email already exists
- `429` - Rate limit exceeded
- `500` - Server error

### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Validation:**
- Email and password present

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` - Missing credentials
- `401` - Invalid credentials (intentionally vague - don't reveal which field)
- `429` - Rate limit exceeded
- `500` - Server error

### POST /auth/refresh

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Validation:**
- Token present and valid JWT signature

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGc..."
}
```

**Error Responses:**
- `400` - Missing token
- `401` - Invalid or expired token
- `429` - Rate limit exceeded
- `500` - Server error

## Data Flow

### Registration Flow
1. Client sends email/password to `/auth/register`
2. Route handler validates input format
3. AuthService checks email uniqueness
4. Password hashed with bcrypt (10 rounds)
5. User saved to database via Prisma
6. Access + refresh tokens generated
7. Tokens and user info returned to client

### Login Flow
1. Client sends email/password to `/auth/login`
2. Route handler validates input presence
3. AuthService fetches user by email
4. Password compared with bcrypt
5. On success: access + refresh tokens generated
6. Tokens and user info returned to client

### Token Refresh Flow
1. Client sends refresh token to `/auth/refresh`
2. Route handler validates token presence
3. AuthService verifies JWT signature and expiry
4. Extract userId from token payload
5. Generate new access token
6. Return new access token

## Security Measures

### Password Security
- **Hashing:** bcrypt with 10 salt rounds
- **Storage:** Only hashed passwords stored, never plaintext
- **Validation:** Minimum 6 characters (can be enhanced)

### Token Security
- **Signing:** HMAC SHA256 (HS256 algorithm)
- **Secret:** Environment variable (JWT_SECRET)
- **Expiry:** Access 15min, Refresh 7 days
- **Validation:** Signature and expiry verified on each use

### Rate Limiting
- **Limit:** 5 requests per minute per IP
- **Scope:** All auth endpoints
- **Response:** HTTP 429 with Retry-After header
- **Purpose:** Prevent brute force attacks

### Error Handling
- **Generic messages:** Don't reveal if email exists during login
- **No stack traces:** Production mode hides internal errors
- **Logging:** Errors logged server-side for debugging
- **Validation:** Input sanitization and type checking

## Testing Strategy

### Test Coverage (~15-18 tests)

**Register Endpoint:**
1. ✓ Successfully creates user and returns tokens
2. ✓ Rejects duplicate email (409)
3. ✓ Rejects invalid email format (400)
4. ✓ Rejects missing/short password (400)

**Login Endpoint:**
1. ✓ Successfully logs in existing user
2. ✓ Rejects wrong password (401)
3. ✓ Rejects non-existent email (401)
4. ✓ Rejects missing credentials (400)

**Refresh Endpoint:**
1. ✓ Successfully returns new access token
2. ✓ Rejects invalid/malformed token (401)
3. ✓ Rejects expired refresh token (401)
4. ✓ Rejects missing token (400)

**Rate Limiting:**
1. ✓ Blocks 6th request within minute (429)

### Test Infrastructure
- **Database:** In-memory SQLite (`:memory:`) for isolation
- **Reset:** Fresh database for each test suite
- **Framework:** Jest with Supertest for HTTP assertions
- **Helpers:** Utility functions to create test users

## Environment Configuration

**.env.example:**
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=3000
```

**Security Note:** JWT_SECRET must be strong and unique in production (use cryptographically random string, 256+ bits).

## NPM Scripts

```json
{
  "dev": "ts-node-dev --respawn src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "migrate": "prisma migrate dev"
}
```

## Documentation Content (README.md)

The README will include:

1. **Overview** - What the system demonstrates
2. **Prerequisites** - Node.js 18+
3. **Setup Instructions** - Step-by-step commands
4. **API Examples** - curl commands for all endpoints with responses
5. **Testing** - How to run tests
6. **Environment Variables** - Configuration explanation
7. **Teaching Points:**
   - Why bcrypt over plain text
   - Access vs refresh token purposes
   - Rate limiting importance
   - Security best practices (generic errors, etc.)

## Teaching Points

This design demonstrates:

### Authentication Concepts
- Token-based authentication vs sessions
- Access/refresh token pattern
- Password hashing (bcrypt)
- JWT structure and validation

### Security Best Practices
- Never store plaintext passwords
- Rate limiting to prevent abuse
- Generic error messages (don't leak info)
- Environment-based configuration
- Input validation

### Software Architecture
- Separation of concerns (routes/services/middleware)
- Service-oriented design
- ORM usage (Prisma)
- TypeScript type safety
- Integration testing

### Industry Standards
- RESTful API design
- HTTP status codes (200, 201, 400, 401, 409, 429, 500)
- JWT industry standard (RFC 7519)
- Bcrypt for password hashing

## Possible Student Enhancements

Students can extend this system to learn more:

1. **Token Revocation** - Add refresh token storage in DB
2. **Email Verification** - Send confirmation emails
3. **Password Reset** - Implement forgot password flow
4. **User Profiles** - Add profile update endpoints
5. **Role-Based Access** - Add user roles and permissions
6. **OAuth Integration** - Add Google/GitHub login
7. **Stronger Validation** - Zod/Joi schemas, password strength
8. **Audit Logging** - Track login attempts
9. **2FA** - Time-based one-time passwords

## Implementation Approach

The implementation will follow Test-Driven Development:

1. Set up project structure and dependencies
2. Configure TypeScript, Prisma, Jest
3. Write tests for register endpoint
4. Implement register endpoint (service + routes)
5. Write tests for login endpoint
6. Implement login endpoint
7. Write tests for refresh endpoint
8. Implement refresh endpoint
9. Add rate limiting
10. Write comprehensive README
11. Verify all tests pass

## Success Criteria

- ✓ All 3 endpoints functional
- ✓ All tests passing (15-18 tests)
- ✓ Rate limiting working (5 req/min)
- ✓ README with setup instructions and curl examples
- ✓ TypeScript compilation without errors
- ✓ Clean code structure demonstrating service pattern
- ✓ Essential security validations in place
