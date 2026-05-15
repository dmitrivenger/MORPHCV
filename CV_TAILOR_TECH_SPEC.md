# CV TAILOR - Technical Specification
**Personal CV Customization Tool with Claude AI Integration**

---

## 1. EXECUTIVE SUMMARY

### What We're Building
A web application that:
1. Accepts a job posting URL or text
2. Reads your CV (PDF/DOCX)
3. Tailors your CV to match the job description using Claude AI
4. Allows interactive refinement via chat with Claude
5. Exports the customized CV as a PDF

### Key Features
- ✅ URL scraping (with fallback to manual paste)
- ✅ CV parsing and extraction
- ✅ Intelligent CV customization with Claude
- ✅ Interactive chat refinement
- ✅ PDF generation and download
- ✅ Session history storage (optional)
- ✅ Token-optimized Claude API usage (~3.5K tokens per customization)
- ✅ No authentication required (personal tool)

### Budget
- Claude API: $20/month covers ~1,900 customizations (very comfortable)
- Supabase: Free tier sufficient
- Hosting: Free (Vercel + Railway)

---

## 2. TECH STACK & DEPENDENCIES

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^5.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "axios": "^1.6.0",
  "react-markdown": "^9.0.0",
  "react-pdf": "^7.5.0",
  "pdfjs-dist": "^3.11.174"
}
```

### Backend
```json
{
  "express": "^4.18.0",
  "node": "^18.0.0",
  "cors": "^2.8.0",
  "dotenv": "^16.0.0",
  "@supabase/supabase-js": "^2.38.0",
  "@anthropic-ai/sdk": "^0.8.0",
  "puppeteer": "^21.0.0",
  "cheerio": "^1.0.0",
  "pdfkit": "^0.13.0",
  "mammoth": "^1.6.0",
  "uuid": "^9.0.0"
}
```

### Database
- **Supabase** (PostgreSQL) - Free tier
- No ORM needed; direct SQL queries or supabase-js

### Deployment
- **Frontend**: Vercel (Free)
- **Backend**: Railway or Render (Free tier with $5 credit)
- **Database**: Supabase (Free tier, 500MB)

---

## 3. DATABASE SCHEMA

### Supabase SQL Setup

```sql
-- ============================================
-- Table: job_postings
-- ============================================
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT,
  raw_jd TEXT NOT NULL,
  parsed_json JSONB DEFAULT NULL,
  title TEXT,
  company TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- ============================================
-- Table: customized_cvs
-- ============================================
CREATE TABLE customized_cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  original_cv_json JSONB NOT NULL,
  customized_content TEXT NOT NULL,
  pdf_binary BYTEA DEFAULT NULL,
  is_downloaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customized_cvs_created_at ON customized_cvs(created_at DESC);
CREATE INDEX idx_customized_cvs_job_posting ON customized_cvs(job_posting_id);

-- ============================================
-- Table: chat_history
-- ============================================
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customized_cv_id UUID REFERENCES customized_cvs(id) ON DELETE CASCADE,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_history_cv ON chat_history(customized_cv_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- ============================================
-- Table: sessions (optional, for browser storage reference)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_key TEXT UNIQUE,
  cv_text TEXT,
  cv_parsed JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Data Models (TypeScript)

```typescript
// Job Posting
interface JobPosting {
  id: string;
  url?: string;
  raw_jd: string;
  parsed_json?: {
    title: string;
    company: string;
    content: string;
    requirements: string[];
    nice_to_haves: string[];
  };
  created_at: string;
}

// CV (parsed from file)
interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  certifications?: string[];
}

// Customized CV
interface CustomizedCV {
  id: string;
  job_posting_id: string;
  original_cv_json: ParsedCV;
  customized_content: string;
  pdf_binary?: Buffer;
  created_at: string;
}

// Chat Message
interface ChatMessage {
  id: string;
  customized_cv_id: string;
  message_role: 'user' | 'assistant';
  content: string;
  tokens_used?: number;
  created_at: string;
}
```

---

## 4. PROJECT STRUCTURE

```
cv-tailor/
├── .env                          # Environment variables (NOT in git)
├── .env.example                  # Template for .env
├── .gitignore
├── package.json
├── tsconfig.json
│
├── backend/
│   ├── server.ts                 # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── supabase.ts       # Supabase client setup
│   │   │   ├── claude.ts         # Claude client setup
│   │   │   └── env.ts            # Environment validation
│   │   │
│   │   ├── routes/
│   │   │   ├── jd.ts             # POST /api/jd/fetch, /api/jd/parse
│   │   │   ├── cv.ts             # POST /api/cv/parse (receive from frontend)
│   │   │   ├── customize.ts      # POST /api/customize
│   │   │   ├── chat.ts           # POST /api/chat
│   │   │   ├── export.ts         # POST /api/export-pdf
│   │   │   └── history.ts        # GET /api/history
│   │   │
│   │   ├── services/
│   │   │   ├── scraper.ts        # URL scraping (Cheerio + Puppeteer)
│   │   │   ├── parser.ts         # Parse CV & JD text
│   │   │   ├── claude.ts         # Claude API calls
│   │   │   ├── pdf.ts            # PDF generation
│   │   │   └── db.ts             # Database operations
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.ts         # Simple logging
│   │   │   ├── errors.ts         # Error handling
│   │   │   └── validators.ts     # Input validation
│   │   │
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   │
│   └── dist/                     # Compiled output (ignored in git)
│
├── frontend/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── index.html
│   │
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Main component
│   │   ├── index.css             # Tailwind imports
│   │   │
│   │   ├── components/
│   │   │   ├── CVUpload.tsx       # File upload component
│   │   │   ├── JobInput.tsx       # URL/text input component
│   │   │   ├── CVPreview.tsx      # Rendered CV display
│   │   │   ├── ChatRefinement.tsx # Claude chat interface
│   │   │   ├── ExportPDF.tsx      # PDF download button
│   │   │   ├── LoadingSpinner.tsx # Loading state
│   │   │   └── StatusMessage.tsx  # Error/success messages
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts            # Axios instance + API calls
│   │   │   └── storage.ts        # Session storage utility
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCVContext.ts   # CV state management
│   │   │   └── useJobContext.ts  # Job state management
│   │   │
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   │
│   │   └── utils/
│   │       └── fileHelpers.ts    # File parsing utilities
│   │
│   ├── public/
│   │   └── favicon.ico
│   │
│   └── dist/                     # Compiled output (ignored in git)
│
└── docs/
    ├── API_SPEC.md               # Detailed API documentation
    └── DEPLOYMENT.md             # Deployment guide
```

---

## 5. ENVIRONMENT SETUP

### Backend `.env.example`
```bash
# Server
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Claude API
ANTHROPIC_API_KEY=your-api-key-here

# Optional: Puppeteer config
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

### Frontend `.env.example`
```bash
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

### Setup Steps
1. Create Supabase project (free)
2. Run SQL schema (copy from Section 3)
3. Get API keys from Supabase and Anthropic
4. Create `.env` files from `.env.example`
5. Install dependencies: `npm install` (both frontend & backend)

---

## 6. DETAILED API SPECIFICATION

### Base URL
```
Development: http://localhost:3000
Production: https://cv-tailor-api.railway.app (or equivalent)
```

### Error Response Format
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 6.1 JD Fetch Endpoint
```
POST /api/jd/fetch
Content-Type: application/json

Request Body:
{
  "url": "https://example.com/jobs/123",    // Optional
  "raw_text": "Job Description text here"    // Optional (fallback)
}

Response (200):
{
  "id": "uuid-string",
  "url": "https://example.com/jobs/123",
  "raw_jd": "Full job description text",
  "parsed_json": {
    "title": "Senior Software Engineer",
    "company": "TechCorp",
    "content": "Full job posting",
    "requirements": ["5+ years experience", "Python", "AWS"],
    "nice_to_haves": ["React", "Kubernetes"]
  },
  "created_at": "2024-01-15T10:30:00Z"
}

Error Cases:
- 400: Missing both url and raw_text
- 500: Failed to scrape URL (should be logged)
  Response: Include fallback message asking user to paste text
```

**Implementation Notes:**
- Try Cheerio first (fast), fallback to Puppeteer (slow but handles JS)
- If both fail, return error with fallback input field suggestion
- Parse content with Claude (small, optimized prompt) to extract structured data
- Store both raw and parsed versions in DB

---

### 6.2 Customize Endpoint
```
POST /api/customize
Content-Type: application/json

Request Body:
{
  "job_posting_id": "uuid-string",
  "cv_parsed": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+31 6 12345678",
    "summary": "...",
    "skills": ["Python", "React", "AWS"],
    "experience": [
      {
        "title": "Senior Engineer",
        "company": "Company A",
        "duration": "2020-2023",
        "description": "Led team of 5..."
      }
    ],
    "education": [
      {
        "degree": "BS Computer Science",
        "school": "University",
        "year": "2015"
      }
    ]
  }
}

Response (200):
{
  "customized_cv_id": "uuid-string",
  "customized_content": "Full customized CV text",
  "created_at": "2024-01-15T10:30:00Z"
}

Streaming:
- Use server-sent events OR return as text/plain with streaming
- Send updates in real-time as Claude generates
```

**Implementation Notes:**
- Compress CV to JSON (not raw text) - saves tokens
- Send to Claude with optimized system prompt
- Claude returns content wrapped in [CUSTOMIZED_CV]...[/CUSTOMIZED_CV]
- Parse and store in DB
- Return customized text immediately
- Keep job posting & CV data in memory for chat refinement

---

### 6.3 Chat Refinement Endpoint
```
POST /api/chat
Content-Type: application/json

Request Body:
{
  "customized_cv_id": "uuid-string",
  "user_message": "Make the leadership section more prominent"
}

Response (200):
{
  "assistant_message": "I've updated the leadership section...",
  "updated_cv": "Full customized CV with updates",
  "chat_id": "uuid-string",
  "tokens_used": 1250
}

Streaming:
- Stream response as it comes from Claude
```

**Implementation Notes:**
- Fetch chat history from DB (last 5 messages for context)
- Include current CV in system context
- Stream Claude response back to frontend
- Save user message + assistant response to chat_history table
- Update customized_cvs.customized_content with new version
- Track token usage for billing awareness

---

### 6.4 Export PDF Endpoint
```
POST /api/export-pdf
Content-Type: application/json

Request Body:
{
  "customized_cv_id": "uuid-string"
}

Response (200):
Content-Type: application/pdf

[Binary PDF data]

OR use Content-Disposition for download:
Content-Disposition: attachment; filename="John_Doe_CV.pdf"
```

**Implementation Notes:**
- Fetch customized_content from DB
- Parse sections (name, email, skills, experience, etc.)
- Use pdfkit to generate professional PDF
- Return as binary with proper headers
- Optionally store PDF in DB (pdf_binary field)

---

### 6.5 History Endpoint
```
GET /api/history

Query Parameters:
?limit=20&offset=0

Response (200):
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "uuid-string",
      "job_posting": {
        "title": "Senior Engineer",
        "company": "TechCorp",
        "url": "https://..."
      },
      "created_at": "2024-01-15T10:30:00Z",
      "has_chat": true,
      "chat_message_count": 3
    }
  ]
}
```

**Implementation Notes:**
- Paginated results
- Sort by created_at DESC
- Include job posting details for context
- Note if chat refinement was done

---

## 7. FRONTEND SPECIFICATION

### Architecture & State Management

```
App.tsx (main container)
├── CVUploadSection (component)
│   └── Local state: cv_file, cv_parsed
│
├── JobInputSection (component)
│   └── Local state: job_url, job_text, job_parsed
│
├── CustomizationSection (component)
│   ├── [Customize Button]
│   ├── CVPreview (component)
│   │   └── Displays formatted CV
│   │
│   └── [Export PDF Button]
│
└── ChatRefinement (component)
    ├── Chat history display
    ├── Message input
    └── Updated CV preview (live)

Context:
- CVContext: { cv_parsed, setCVParsed }
- JobContext: { job_parsed, setJobParsed, customized_cv_id }
```

### Key Components

#### 1. CVUpload.tsx
```typescript
interface Props {
  onCVParsed: (cv: ParsedCV) => void;
  onError: (error: string) => void;
}

// Features:
// - Drag-drop file upload
// - Accept PDF, DOCX
// - Parse using mammoth (DOCX) or pdf-parse (PDF) on frontend
// - Extract text, send to backend for structured parsing
// - Show preview of parsed sections
// - Validate email & name extraction
```

#### 2. JobInput.tsx
```typescript
interface Props {
  onJobFetched: (job: JobPosting) => void;
  onError: (error: string) => void;
}

// Features:
// - URL input field with [Fetch] button
// - Fallback text area for manual paste
// - Shows parsed job title, company, requirements
// - Loading state while fetching/parsing
// - Error message if URL scraping fails (with fallback prompt)
```

#### 3. CVPreview.tsx
```typescript
interface Props {
  cv: string; // Formatted CV content
  isLoading?: boolean;
}

// Features:
// - Display customized CV in readable format
// - Syntax highlighting for structure
// - Sections: name, email, skills, experience, education
// - Scrollable container
// - Print-friendly styling
```

#### 4. ChatRefinement.tsx
```typescript
interface Props {
  customized_cv_id: string;
  initial_cv_content: string;
}

// Features:
// - Chat history display
// - Input field with send button
// - Real-time streaming response
// - Updated CV preview below
// - Loading spinner while Claude processes
// - Error handling with retry
// - Typing indicator
```

#### 5. ExportPDF.tsx
```typescript
interface Props {
  customized_cv_id: string;
  cv_content: string;
}

// Features:
// - Single [Download PDF] button
// - Shows filename: "John_Doe_CV.pdf"
// - Loading state (requesting from backend)
// - Error handling
// - Success confirmation
```

---

### UI/UX Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CV TAILOR                                  │
│                    Your AI CV Optimizer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Upload Your CV                                  │   │
│  │                                                           │   │
│  │ 📄 Drag & drop PDF or DOCX here                         │   │
│  │    [Or click to browse]                                 │   │
│  │                                                           │   │
│  │ ✓ Uploaded: john_doe_cv.pdf                             │   │
│  │   Preview:                                              │   │
│  │   • Name: John Doe                                      │   │
│  │   • Email: john@example.com                             │   │
│  │   • Skills: 12 identified                               │   │
│  │   • Experience: 3 positions                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Provide Job Description                         │   │
│  │                                                           │   │
│  │ Option A - Paste URL:                                  │   │
│  │ [https://linkedin.com/jobs/123456789     ] [Fetch] 🔄  │   │
│  │                                                           │   │
│  │ Option B - Paste Text:                                 │   │
│  │ [                                                        │   │
│  │   Senior Software Engineer...                           │   │
│  │   Requirements: 5+ years Python...                      │   │
│  │  ]                                                       │   │
│  │                                                           │   │
│  │ ✓ Parsed:                                               │   │
│  │   • Title: Senior Software Engineer                     │   │
│  │   • Company: TechCorp                                   │   │
│  │   • Requirements: 8 identified                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Generate Customized CV] ✨                                    │
│                                                                  │
│  ┌────────────────────────┬────────────────────────────────┐   │
│  │ CUSTOMIZED CV PREVIEW  │  REFINE WITH CLAUDE            │   │
│  │ ═════════════════════  │  ════════════════════════      │   │
│  │                        │                                 │   │
│  │ John Doe               │ You: "Make skills section       │   │
│  │ john@example.com       │ match their tech stack"        │   │
│  │ +31 6 12345678         │                                 │   │
│  │                        │ Claude: "I've reordered your    │   │
│  │ PROFESSIONAL SUMMARY   │ skills to emphasize AWS..."    │   │
│  │ Experienced engineer   │                                 │   │
│  │ with focus on cloud    │ [Message input: ________]      │   │
│  │ technologies...        │ [Send]                          │   │
│  │                        │                                 │   │
│  │ SKILLS (REORDERED)     │                                 │   │
│  │ • AWS, Python, React   │                                 │   │
│  │ • Kubernetes, Docker   │                                 │   │
│  │                        │                                 │   │
│  │ EXPERIENCE             │                                 │   │
│  │ Senior Engineer        │                                 │   │
│  │ TechCorp (2020-2024)   │                                 │   │
│  │ Led cloud migration... │                                 │   │
│  │ [scroll...]            │                                 │   │
│  └────────────────────────┴────────────────────────────────┘   │
│                                                                  │
│  [Download PDF]  [New Job]  [View History]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Design Direction (for frontend-design skill)

**Aesthetic**: Modern, professional minimalism with productivity focus
- **Typography**: Typeface pairing - "Courier Prime" for display (code-like precision), "Inter" for body (clean, efficient)
- **Color**: Dark mode optimized (dark bg, light text), blue accents for actions
- **Layout**: Vertical flow, clear step indicators, left/right split for preview + chat
- **Motion**: Subtle animations on state changes, smooth transitions
- **Key Detail**: Breadcrumb progress indicator (Step 1 → Step 2 → Step 3 → Done)

---

## 8. CLAUDE INTEGRATION DETAILS

### API Configuration
```typescript
// backend/src/config/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default client;
```

### Token Budget & Optimization

**Per Customization Cost:**
- CV (compressed JSON): ~800 tokens
- Job Description (compressed JSON): ~400 tokens
- System prompt + instructions: ~300 tokens
- Claude generation: ~1,500 tokens (max)
- **Total: ~3,000 tokens per customization**

**Monthly Budget:**
- $20 Claude subscription = ~6.6M tokens
- Per customization: 3,000 tokens
- **Capacity: 2,200 customizations/month** ✅ Very comfortable

### System Prompt (Optimized)

```typescript
const CUSTOMIZE_SYSTEM_PROMPT = `You are a professional CV optimization expert.

Your task: Reorder and rewrite the provided CV to match the job description.

## Rules:
1. Reorder sections to emphasize relevant experience first
2. Reword achievements using job description keywords
3. Highlight quantifiable metrics
4. Keep all factual information accurate
5. Remove irrelevant roles if needed for space

## Output Format:
[CUSTOMIZED_CV]
Name
Email | Phone

PROFESSIONAL SUMMARY
[Brief summary aligned with role]

SKILLS
[Reordered by relevance to JD - max 10 skills]

EXPERIENCE
[Most relevant role first, with JD-aligned achievements]

EDUCATION
[Degrees and certifications]
[/CUSTOMIZED_CV]`;
```

### API Calls

#### 1. Customization Request
```typescript
async function customizeCV(
  cv: ParsedCV,
  jd: JobPosting
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4-20250514", // Use Opus (cheaper than Sonnet)
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `
CV (JSON):
${JSON.stringify(cv, null, 2)}

JOB DESCRIPTION:
${jd.raw_jd.substring(0, 2000)} // Truncate long JDs

Please customize this CV for this role.
        ` 
      }
    ]
  });

  // Extract content from [CUSTOMIZED_CV]...[/CUSTOMIZED_CV]
  const text = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';
  
  const match = text.match(/\[CUSTOMIZED_CV\](.*?)\[\/CUSTOMIZED_CV\]/s);
  return match ? match[1].trim() : text;
}
```

#### 2. Chat Refinement Request
```typescript
async function refineCV(
  customizedCVId: string,
  userMessage: string,
  cvContent: string,
  chatHistory: ChatMessage[]
): Promise<string> {
  const messages = [
    ...chatHistory.map(msg => ({
      role: msg.message_role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: "user" as const,
      content: `
Current CV:
${cvContent}

User request: ${userMessage}

Please make the requested changes to the CV.
      `
    }
  ];

  const response = await client.messages.stream({
    model: "claude-opus-4-20250514",
    max_tokens: 1500,
    messages
  });

  let fullResponse = '';
  
  for await (const event of response) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullResponse += event.delta.text;
      // Stream to frontend via res.write()
    }
  }

  return fullResponse;
}
```

---

## 9. IMPLEMENTATION ORDER (Step-by-Step)

### Phase 1: Backend Setup (1-2 days)

**Step 1.1: Initialize Backend**
```bash
mkdir cv-tailor-backend
cd cv-tailor-backend
npm init -y
npm install express cors dotenv @supabase/supabase-js @anthropic-ai/sdk
npm install --save-dev typescript @types/node
npx tsc --init
```

**Step 1.2: Create Supabase Setup**
- Create free Supabase project
- Run SQL schema from Section 3
- Get SUPABASE_URL and SUPABASE_ANON_KEY
- Create .env file

**Step 1.3: Create Core Files**
- `backend/src/config/supabase.ts` - Initialize Supabase client
- `backend/src/config/claude.ts` - Initialize Claude client
- `backend/src/config/env.ts` - Validate environment variables
- `backend/server.ts` - Express app setup

**Step 1.4: Test Basic Setup**
- GET /health endpoint (returns 200)
- Test Supabase connection
- Test Claude API key

---

### Phase 2: API Routes - JD Handling (1 day)

**Step 2.1: URL Scraping Service**
- `backend/src/services/scraper.ts`
  - Install: `npm install puppeteer cheerio`
  - Implement Cheerio scraper (fast)
  - Implement Puppeteer fallback (handles JS)
  - Return raw text or error

**Step 2.2: JD Parsing Service**
- `backend/src/services/parser.ts`
  - Takes raw JD text
  - Calls Claude to extract structured data (title, company, requirements)
  - Returns parsed JobPosting object
  - Keep prompt minimal for token efficiency

**Step 2.3: JD Routes**
- `backend/src/routes/jd.ts`
  - POST /api/jd/fetch
    - Input: URL or raw_text
    - Scrape if URL provided
    - Parse result
    - Save to DB
    - Return parsed JD

**Step 2.4: Test**
- Test with real job URLs
- Test with pasted text
- Verify scraping fallback works
- Check token usage in console

---

### Phase 3: API Routes - CV Processing (1 day)

**Step 3.1: CV Upload & Parsing (Frontend Handles)**
- Frontend uses mammoth (DOCX) or pdfjs (PDF)
- Extracts raw text, sends to backend

**Step 3.2: CV Parsing Service**
- `backend/src/services/parser.ts` (extend)
  - Takes CV raw text
  - Calls Claude to extract structured data
  - Returns ParsedCV object

**Step 3.3: Customize Route**
- `backend/src/routes/customize.ts`
  - POST /api/customize
  - Input: cv_parsed + job_posting_id
  - Call customizeCV() service
  - Save to DB (customized_cvs table)
  - Return customized text

**Step 3.4: Test**
- Test CV parsing
- Test customization
- Verify output quality
- Check token usage

---

### Phase 4: Chat Refinement (1 day)

**Step 4.1: Chat Route**
- `backend/src/routes/chat.ts`
  - POST /api/chat
  - Input: customized_cv_id + user_message
  - Fetch CV + chat history from DB
  - Call Claude with stream
  - Save messages to DB
  - Stream response to frontend

**Step 4.2: Database Operations**
- `backend/src/services/db.ts`
  - saveChatMessage()
  - getChatHistory()
  - updateCustomizedCV()
  - These are called from routes

**Step 4.3: Test**
- Test chat refinement
- Verify history persistence
- Check streaming works
- Monitor token usage

---

### Phase 5: PDF Export (1 day)

**Step 5.1: PDF Generation Service**
- `backend/src/services/pdf.ts`
  - Install: `npm install pdfkit`
  - Parse CV text into sections
  - Create professional PDF
  - Return Buffer

**Step 5.2: Export Route**
- `backend/src/routes/export.ts`
  - POST /api/export-pdf
  - Fetch customized CV from DB
  - Generate PDF
  - Return with Content-Type: application/pdf

**Step 5.3: Test**
- Generate test PDFs
- Download and verify formatting
- Check file naming

---

### Phase 6: Frontend Setup (1-2 days)

**Step 6.1: Initialize Frontend**
```bash
npm create vite@latest cv-tailor-frontend -- --template react-ts
cd cv-tailor-frontend
npm install axios react-markdown tailwindcss
npm install --save-dev @tailwindcss/forms
```

**Step 6.2: Configure Tailwind**
- `frontend/tailwind.config.js`
- `frontend/src/index.css` with Tailwind imports

**Step 6.3: Create Context & Hooks**
- `frontend/src/hooks/useCVContext.ts`
- `frontend/src/hooks/useJobContext.ts`
- Setup React Context for shared state

**Step 6.4: Create Services**
- `frontend/src/services/api.ts`
  - Axios instance
  - Methods for all API calls
  - Error handling

**Step 6.5: Test**
- Test API connectivity
- Verify .env loading
- Mock API responses

---

### Phase 7: Frontend Components (2 days)

**Step 7.1: Layout & Main App**
- `frontend/src/App.tsx` - Main container
- `frontend/src/components/LoadingSpinner.tsx`
- `frontend/src/components/StatusMessage.tsx`

**Step 7.2: Step 1 - CV Upload**
- `frontend/src/components/CVUpload.tsx`
- Drag-drop file handling
- File parsing (mammoth + pdfjs)
- Preview of parsed data

**Step 7.3: Step 2 - Job Input**
- `frontend/src/components/JobInput.tsx`
- URL input + fetch button
- Text fallback
- Parsed preview

**Step 7.4: Step 3 - Customization & Preview**
- `frontend/src/components/CVPreview.tsx`
- Formatted CV display
- Scrollable
- Print-friendly

**Step 7.5: Step 4 - Chat & Export**
- `frontend/src/components/ChatRefinement.tsx`
- Chat history
- Message input
- Streaming response
- Live CV preview update

- `frontend/src/components/ExportPDF.tsx`
- Download button
- Filename customization

**Step 7.6: Test All Components**
- Test file uploads
- Test API calls
- Test chat streaming
- Test PDF export

---

### Phase 8: Integration & Polish (1 day)

**Step 8.1: End-to-End Testing**
- Full workflow: upload CV → paste JD → customize → chat → export
- Error handling at each step
- Loading states

**Step 8.2: UI Polish**
- Responsive design (mobile, tablet, desktop)
- Dark mode considerations
- Accessibility (ARIA labels, keyboard nav)

**Step 8.3: Performance**
- Lazy loading for components
- Debounce inputs
- Cache results where appropriate

**Step 8.4: Logging & Monitoring**
- Log API calls
- Track token usage
- Log errors

---

### Phase 9: Deployment (1 day)

**Step 9.1: Backend Deployment**
- Deploy to Railway or Render
- Set environment variables
- Test in production

**Step 9.2: Frontend Deployment**
- Build: `npm run build`
- Deploy to Vercel
- Point to production API

**Step 9.3: Documentation**
- README.md
- Deployment guide
- Usage guide

---

## 10. BUILD CHECKLIST

### Pre-Build
- [ ] Supabase project created
- [ ] API keys obtained (Claude, Supabase)
- [ ] .env files created
- [ ] Dependencies listed and understood

### Backend
- [ ] Express server boots
- [ ] Supabase connection works
- [ ] Claude client initialized
- [ ] JD scraping (both methods) works
- [ ] CV parsing works
- [ ] Customization produces quality output
- [ ] Chat stores messages
- [ ] PDF generation produces readable files
- [ ] All endpoints return proper error responses
- [ ] Logging shows token usage
- [ ] Rate limiting in place (optional)

### Frontend
- [ ] Components render without errors
- [ ] File upload accepts PDF & DOCX
- [ ] API calls successful
- [ ] Chat streams responses
- [ ] PDF downloads with correct filename
- [ ] Responsive on mobile
- [ ] Loading states show
- [ ] Error messages display

### Integration
- [ ] Full workflow end-to-end works
- [ ] No console errors
- [ ] Token usage tracked
- [ ] Sessions persist history
- [ ] Backup/export functionality (optional)

### Deployment
- [ ] Backend deployed & accessible
- [ ] Frontend deployed & accessible
- [ ] Environment variables set correctly
- [ ] Database accessible from production
- [ ] Logging shows in production
- [ ] Can download PDF from production

---

## 11. OPTIONAL ENHANCEMENTS

### Phase 10: Future Features (Not in MVP)

1. **History & Sessions**
   - Save past customizations
   - Load and re-export
   - Compare versions

2. **Multiple CVs**
   - Store multiple CV versions
   - Switch between them
   - Default selection

3. **Batch Processing**
   - Process multiple JDs at once
   - Queue management

4. **Analytics**
   - Track which skills are most common in JDs
   - Success metrics (optional callback)

5. **Sharing**
   - Generate shareable links
   - View-only CV sharing

6. **Templating**
   - Save custom CV templates
   - Apply to new jobs

---

## 12. TROUBLESHOOTING & COMMON ISSUES

### Issue: URL Scraping Fails
**Solution**: Implement 3-tier fallback (Cheerio → Puppeteer → Manual Paste)

### Issue: Token Usage Higher Than Expected
**Solution**: Compress CV/JD to JSON before sending, reduce max_tokens, use streaming

### Issue: PDF Formatting Looks Wrong
**Solution**: Test with multiple browsers, use pdfkit for consistent rendering

### Issue: Chat Messages Grow Context
**Solution**: Keep only last 5 messages in history, compress older context

### Issue: Frontend Can't Find API
**Solution**: Check VITE_API_URL environment variable, CORS headers on backend

---

## 13. FINAL NOTES

### Code Quality
- Use TypeScript throughout (no any types)
- Add JSDoc comments for functions
- Error handling at every API boundary
- Input validation on all endpoints

### Security
- Validate file uploads (size, type)
- Rate limit API calls (optional)
- Never log API keys
- Sanitize JD text before Claude (no PII)

### Performance
- Cache Claude responses (optional)
- Compress requests before sending
- Lazy load UI components
- Stream responses from Claude

### Testing
- Manual e2e testing before deployment
- Test with real job postings
- Test with various CV formats
- Monitor Claude token usage daily

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Claude AI  
**Status**: Ready for Implementation
