Create a private blogging platform that generates blog posts by analyzing iMessage threads. 
For now, one blog post for each time-based thread. But in the future, we may want to offer an option to generate one blog post per day or per week if the user prefers longer summary blog posts, rather than shorter individual blog posts based on the discrete thread.

Use this Typescript package to interface with the user's iMessage archive and send/receive messages on their behalf. https://github.com/photon-hq/imessage-kit

Similar to auth-spec.md, the requirements are:
- Typical CRUD operations for blog posts
- SQLite with Prisma ORM
- Comprehensive error handling
- Rate limiting: 5 attempts per minute
Success: All endpoints work, tests pass, documentation generated