# iMessage Blog Platform Design

**Date:** 2025-11-08
**Status:** Approved Design
**Implementation Approach:** Monolithic with Scheduled Tasks (Approach B)

## Overview

A private blogging platform that automatically generates blog posts by analyzing iMessage conversations using AI-powered summarization. The system syncs iMessage data locally, identifies conversation threads, generates draft blog posts via Claude API, and provides a web UI for review and publishing.

## Key Requirements

- Automatic time-based thread detection (2+ hours silence = new thread)
- AI-powered summarization using Claude API
- Draft approval workflow (auto-generate, human review, then publish)
- Simple web UI for managing posts
- CRUD operations for blog posts
- SQLite with Prisma ORM
- Comprehensive error handling
- Rate limiting: 5 attempts/minute for auth, 10/hour for AI generation
- Built on existing Express + JWT authentication system

## Future Extensibility

- Pluggable AI providers (OpenAI, local LLMs)
- Template-based or manual formatting options
- Contact-based organization
- Auto-detect threads with user review
- Message sending capabilities via imessage-kit

## Architecture

### System Components

**Monolithic Express Application** with:
- Service layer for business logic
- Scheduled background tasks (node-cron)
- RESTful API endpoints
- Simple HTML/CSS/JS web interface
- Single SQLite database via Prisma

### Data Flow

```
iMessage Database (read-only)
    ↓
Scheduled Sync Job
    ↓
Messages Table (app database)
    ↓
Thread Detection
    ↓
Claude API Summary Generation
    ↓
Draft Blog Posts
    ↓
User Review (Web UI)
    ↓
Published Blog Posts
```

## Database Schema

### Message Model
```prisma
model Message {
  id                Int           @id @default(autoincrement())
  imessageId        String        @unique  // Original iMessage identifier
  chatId            String                 // Groups messages by conversation
  senderId          String                 // Phone/email of sender
  senderName        String?                // Display name if available
  text              String?                // Message content
  attachments       String?                // JSON array of attachment paths
  sentAt            DateTime               // Original timestamp from iMessage
  syncedAt          DateTime      @default(now())
  processedForPost  Boolean       @default(false)
  posts             PostMessage[]

  @@index([chatId, sentAt])
  @@index([processedForPost])
}
```

### BlogPost Model
```prisma
model BlogPost {
  id              Int           @id @default(autoincrement())
  title           String
  content         String                   // AI-generated summary/narrative
  status          PostStatus    @default(DRAFT)
  threadStartTime DateTime
  threadEndTime   DateTime
  messageCount    Int
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  publishedAt     DateTime?
  messages        PostMessage[]

  @@index([status, createdAt])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### PostMessage Junction
```prisma
model PostMessage {
  id        Int       @id @default(autoincrement())
  postId    Int
  messageId Int
  post      BlogPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  message   Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@unique([postId, messageId])
}
```

## Service Layer

### iMessageSyncService

**Responsibilities:**
- Access iMessage database via imessage-kit
- Sync new messages since last run
- Detect thread boundaries based on time gaps

**Key Methods:**
- `syncNewMessages()` - Import new messages from iMessage DB
- `detectThreadBoundaries(timeGapHours = 2)` - Group messages into threads
- `getLastSyncTime()` - Track sync progress

**Error Handling:**
- Verify macOS platform
- Check database permissions
- Handle locked database (Messages app open)
- Graceful handling of schema changes

### aiSummaryService

**Responsibilities:**
- Generate blog post summaries via Claude API
- Manage API interactions and rate limits

**Key Methods:**
- `generateBlogPost(messages[])` - Create title and content
- `buildPrompt(messages)` - Format conversation for AI
- `handleRateLimit()` - Exponential backoff on 429 errors

**Prompt Template:**
```
You are summarizing a personal iMessage conversation into a blog post.

Conversation participants: [names]
Time period: [start] to [end]
Message count: [count]

Messages:
[formatted message transcript]

Create an engaging blog post that:
1. Captures the main topics and key points
2. Maintains a natural narrative flow
3. Respects the conversational tone
4. Suggests a descriptive title

Format: Return JSON with {title, content}
```

**Error Handling:**
- API key validation
- Rate limit (429) with retry
- Token limit errors (split long threads)
- 30 second timeout per call
- Fallback to raw transcript on failure

### blogPostService

**Responsibilities:**
- CRUD operations for blog posts
- Status management (draft → published → archived)

**Key Methods:**
- `createDraftPost(threadData, aiContent)` - Create from AI output
- `updatePost(id, updates)` - Edit draft title/content
- `publishPost(id)` - Change status, set publishedAt
- `deletePost(id)` - Remove post and junction entries
- `listPosts(filters)` - Query by status, date, etc.
- `getPostWithMessages(id)` - Include source messages

**Business Rules:**
- Only drafts can be edited
- Published posts can be archived but not deleted
- Archiving keeps data but hides from main list

### scheduledTaskService

**Responsibilities:**
- Orchestrate automated workflow
- Run on configurable schedule (default: daily)

**Job Sequence:**
1. Check if job already running (prevent overlaps)
2. Sync new messages via iMessageSyncService
3. Detect unprocessed threads
4. For each thread:
   - Generate summary via aiSummaryService
   - Create draft via blogPostService
   - Mark messages as processed
5. Log results (threads found, posts created, errors)

**Configuration:**
- Cron schedule (env: `SYNC_SCHEDULE`, default: `0 2 * * *` = 2am daily)
- Time gap threshold (env: `THREAD_GAP_HOURS`, default: 2)
- Max threads per run (env: `MAX_THREADS_PER_RUN`, default: 10)

## API Endpoints

All endpoints require JWT authentication (reuse existing auth system).

### Blog Post Management

**GET /api/posts**
- Query params: `status` (draft|published|archived), `limit`, `offset`
- Returns: Array of posts with metadata
- Rate limit: 100/min

**GET /api/posts/:id**
- Returns: Post with full content and source messages
- Rate limit: 100/min

**PUT /api/posts/:id**
- Body: `{ title?, content? }`
- Validation: Only works for drafts
- Returns: Updated post
- Rate limit: 100/min

**POST /api/posts/:id/publish**
- Transitions draft → published
- Sets publishedAt timestamp
- Returns: Published post
- Rate limit: 100/min

**DELETE /api/posts/:id**
- Validation: Only drafts can be deleted
- Cascades to PostMessage junction
- Returns: Success confirmation
- Rate limit: 100/min

**POST /api/posts/:id/archive**
- Transitions published → archived
- Returns: Archived post
- Rate limit: 100/min

### Manual Operations

**POST /api/sync/trigger**
- Manually run message sync
- Returns: Sync results (messages added, errors)
- Rate limit: 10/hour

**POST /api/generate/trigger**
- Manually run draft generation
- Returns: Generation results (drafts created)
- Rate limit: 10/hour (protects AI API costs)

**GET /api/sync/status**
- Returns: Last sync time, message count, next scheduled run
- Rate limit: 100/min

## Web UI

Simple server-rendered HTML pages with vanilla JavaScript for interactivity.

### Pages

**Dashboard (/))**
- Draft count with link
- Published post count
- Last sync time
- Next scheduled sync
- Manual sync/generate buttons

**Drafts (/drafts)**
- Table: Title | Thread Time | Message Count | Actions
- Actions: View | Edit | Publish | Delete
- Preview modal shows content without leaving page

**Published Posts (/posts)**
- Table: Title | Published Date | Message Count | Actions
- Actions: View | Archive | Delete
- Filter by date range

**Post Detail (/posts/:id)**
- Full post content
- Expandable "View Source Messages" section
- Edit button (drafts only)
- Publish/Archive/Delete buttons based on status

**Settings (/settings)**
- Sync schedule configuration
- Thread time gap threshold
- AI prompt template editor
- Privacy mode toggle (scrub phone/email from summaries)

### UI Framework

- Express static file serving
- Bootstrap 5 for styling (simple, no build step)
- Vanilla JavaScript for API calls
- No frontend framework needed (keep it simple)

## Error Handling

### iMessage Integration Errors

- **Platform check:** Error if not macOS, clear message to user
- **Permission denied:** Instructions for granting Full Disk Access
- **Database locked:** Retry with exponential backoff, suggest closing Messages app
- **Schema mismatch:** Log warning, attempt graceful degradation
- **No new messages:** Success with zero count (not an error)

### Claude API Errors

- **Invalid API key:** Fail fast on startup, clear error message
- **Rate limit (429):** Exponential backoff, max 3 retries
- **Token limit:** Split thread into multiple posts or truncate with warning
- **Timeout:** Retry once, then fallback to raw transcript
- **Network errors:** Retry with backoff, then mark thread as "generation_failed"

### Database Errors

- **Validation errors:** Return 400 with specific field errors
- **Unique constraint violations:** Deduplicate messages by imessageId
- **Foreign key errors:** Cascade deletes prevent orphans
- **Transaction failures:** Automatic rollback, preserve data integrity

### User Input Validation

- **XSS prevention:** Sanitize title/content in edit operations
- **SQL injection:** Prisma prevents by default (parameterized queries)
- **File paths:** Validate attachment paths before storage
- **Rate limit exceeded:** Return 429 with Retry-After header

### Logging Strategy

- **Info:** Sync started/completed, drafts generated, posts published
- **Warn:** API retries, fallback to raw transcript, schema mismatches
- **Error:** API failures, database errors, permission issues
- **Debug:** Message counts, thread detection details, API response times

## Security & Privacy

### Authentication
- Reuse existing JWT-based auth system
- All API endpoints require valid token
- Web UI pages check auth on load

### Data Privacy
- iMessage data stored locally in app database
- Only message text sent to Claude API for summarization
- Environment variable `PRIVACY_MODE=true` enables:
  - Scrub phone numbers (replace with "Contact A", "Contact B")
  - Remove email addresses
  - Anonymize names if desired
- User can delete source messages after post generation

### API Key Security
- `ANTHROPIC_API_KEY` stored in `.env` (gitignored)
- Never exposed in API responses
- Validate on application startup

### Rate Limiting
- Auth endpoints: 5 requests/minute (existing)
- AI generation: 10 requests/hour (cost protection)
- Other endpoints: 100 requests/minute (abuse prevention)

## Testing Strategy

### Unit Tests

**iMessageSyncService:**
- Mock imessage-kit responses
- Test thread boundary detection with various time gaps
- Test message deduplication
- Test error handling (locked DB, permission denied)

**aiSummaryService:**
- Mock Claude API responses
- Test prompt construction with different message counts
- Test error handling (rate limits, timeouts, token limits)
- Test fallback to raw transcript

**blogPostService:**
- Test CRUD operations
- Test status transitions (draft → published → archived)
- Test validation (can't edit published, can't delete published)
- Test cascade deletes

**scheduledTaskService:**
- Test job orchestration without actual scheduling
- Test overlap prevention
- Test error recovery

### Integration Tests

**End-to-End Flows:**
- Sync messages → detect threads → generate drafts → publish
- Manual trigger endpoints
- Status query endpoints

**API Endpoint Tests:**
- Use supertest (existing in project)
- Test all CRUD operations
- Test authentication requirements
- Test rate limiting enforcement
- Test input validation

**Database Tests:**
- Verify Prisma migrations
- Test relationships and cascades
- Test unique constraints

### Manual Testing

- [ ] Run on real macOS with actual iMessage database
- [ ] Test with real Claude API key (minimal cost ~$0.10)
- [ ] Navigate full UI workflow: drafts → edit → publish → view
- [ ] Test schedule configuration
- [ ] Verify rate limits trigger correctly
- [ ] Test privacy mode (phone/email scrubbing)

### Test Coverage Goals
- Minimum 80% line coverage
- 100% coverage of error handling paths
- All API endpoints covered

## Success Criteria

✅ **Functional Requirements:**
- All CRUD endpoints work for blog posts
- Automatic sync and draft generation runs on schedule
- Manual trigger endpoints available
- Web UI allows full post management workflow

✅ **Technical Requirements:**
- SQLite + Prisma ORM implementation
- Comprehensive error handling (iMessage, API, database)
- Rate limiting: 5/min auth, 10/hour AI, 100/min general
- JWT authentication on all endpoints

✅ **Quality Requirements:**
- All tests pass with >80% coverage
- Can sync from real iMessage database
- Claude API integration working
- Documentation complete (this design doc + API docs)

## Dependencies

**New Packages to Add:**
- `imessage-kit` - iMessage database access
- `@anthropic-ai/sdk` - Claude API client
- `node-cron` - Scheduled task execution
- `express-validator` - Input sanitization (optional, can use manual validation)

**Existing Packages (Reuse):**
- `express` - Web server
- `@prisma/client`, `prisma` - ORM
- `jsonwebtoken`, `bcrypt` - Authentication
- `express-rate-limit` - Rate limiting
- `jest`, `supertest` - Testing

## Implementation Notes

**Phase 1: Foundation**
1. Add new Prisma models and migration
2. Set up imessage-kit integration
3. Implement iMessageSyncService with basic sync

**Phase 2: AI Integration**
4. Add Claude API integration
5. Implement aiSummaryService
6. Create prompt template

**Phase 3: Core Features**
7. Implement blogPostService CRUD
8. Set up scheduled tasks
9. Add manual trigger endpoints

**Phase 4: User Interface**
10. Create web UI pages
11. Add frontend JavaScript for interactions
12. Style with Bootstrap

**Phase 5: Testing & Polish**
13. Write comprehensive tests
14. Add error handling and logging
15. Document API endpoints
16. Test on real iMessage data

## Future Enhancements

- **Pluggable AI providers:** Abstract AI interface, support OpenAI, local LLMs
- **Advanced thread detection:** Contact-based, keyword-based, manual review
- **Rich editing:** Markdown support, image handling, code blocks
- **Export options:** PDF, Markdown, HTML export
- **Search:** Full-text search across posts and messages
- **Tags/categories:** Organize posts by topic
- **RSS feed:** Subscribe to published posts
- **Public/private posts:** Selective sharing
