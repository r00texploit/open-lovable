# OMC Notepad - Noeron AI Website Builder

## PRIORITY

**Project**: Noeron - AI-powered website builder (Next.js 15 + React 19 + TypeScript)
**Hot Paths**: 
- `components/shared/pixi/Pixi.tsx` (11 accesses)
- `components/shared/header/BrandKit/BrandKit.tsx` (4 accesses)
- `lib/session-store.ts` (4 accesses)
- `lib/request-context.ts` (3 accesses)

**Critical Files**:
- `lib/sandbox/factory.ts` - Sandbox abstraction layer
- `lib/ai/provider-manager.ts` - Multi-provider AI SDK
- `config/app.config.ts` - Central app configuration
- `app/api/create-ai-sandbox/route.ts` - Sandbox creation API

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, Vercel Sandbox/E2B

---

## WORKING

### Recent Activity
- OMC hooks configured for auto-format/lint/type-check
- Project memory initialized with tech stack detection

### Active Development Areas
- Landing page sections in `components/app/(home)/sections/`
- Sandbox providers (Vercel/E2B) in `lib/sandbox/providers/`
- AI provider management for multi-LLM support

### Notes
- Sandboxes run on port 3000 (Vercel) or 5173 (E2B)
- File changes tracked in `global.existingFiles`
- Brand styles cached per session

---

## MANUAL

### Development Commands
```bash
pnpm dev      # Dev server with Turbopack
pnpm build    # Production build
pnpm lint     # ESLint check
```

### Testing
```bash
pnpm run test:api   # API endpoint tests
pnpm run test:code  # Code execution tests
pnpm run test:all   # All tests
```

### Architecture Notes
- **Frontend**: Next.js App Router, Jotai for state, Framer Motion for animations
- **Backend**: API routes in `app/api/`, Prisma + Neon for database
- **Sandbox**: Abstracted via `SandboxFactory`, supports Vercel and E2B
- **AI**: Multi-provider (OpenAI, Anthropic, Google, Groq) via provider-manager

### Security Considerations
- All API routes need authentication checks
- Sandbox commands are sandboxed but verify inputs
- Firecrawl API key required for scraping

### Environment Variables Required
```
FIRECRAWL_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
SANDBOX_PROVIDER=vercel|e2b
VERCEL_TOKEN= (or VERCEL_OIDC_TOKEN)
```
