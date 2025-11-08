Build a JWT authentication system with:
- POST /auth/register - Create user account
- POST /auth/login - Return access/refresh tokens
- POST /auth/refresh - Exchange refresh for new access token
Requirements:
- Use Express.js with TypeScript
- Bcrypt for password hashing (10 rounds)
- JWT tokens: 15min access, 7 day refresh
- SQLite with Prisma ORM
- Comprehensive error handling
- Rate limiting: 5 attempts per minute
Success: All endpoints work, tests pass, documentation generated