# OMC Engineering Setup - Noeron

## Overview

This project is now fully configured with OMC (oh-my-claudecode) engineering tools:

### ✅ Components Installed

1. **Hooks** (`.claude/hooks.json`)
   - Auto-format on Write/Edit (Prettier)
   - ESLint auto-fix on Write/Edit
   - TypeScript incremental type-check with 60s timeout
   - Build verification on Stop

2. **Skills** (`.claude/agents/skills/`)
   - `nextjs-expert` - Next.js 15 App Router patterns
   - `react-expert` - React 19 patterns & performance
   - `typescript-expert` - Type safety & generics
   - `tailwind-expert` - Styling & custom utilities
   - `prisma-expert` - Database ORM patterns
   - `sandbox-expert` - Vercel/E2B sandbox abstraction

3. **State Management** (`.omc/state/`)
   - `project.json` - Project phases & workflows
   - `active-session.json` - Current session state

4. **Notepad** (`.omc/notepad.md`)
   - PRIORITY section: Project context, hot paths
   - WORKING section: Active development areas
   - MANUAL section: Commands, architecture notes

5. **Agent Configuration** (`.claude/AGENTS.md`)
   - Agent routing rules
   - Parallel execution guidelines
   - Multi-perspective analysis patterns

6. **Project Memory** (`.omc/project-memory.json`)
   - Tech stack detection
   - Directory mapping
   - Hot path tracking

## Workflow

### Development Cycle

```
1. Write/Edit code → Hooks auto-format, lint, type-check
2. Need help → Skills provide expert guidance
3. Complex task → Planner agent creates plan
4. Code complete → Review agent validates
5. Session end → Build verification runs
```

### Skill Invocation

Skills are automatically loaded based on file context. Reference them:
- `nextjs-expert` - For API routes, layouts, loading states
- `react-expert` - For component patterns, hooks, performance
- `typescript-expert` - For type design, generics, guards
- `tailwind-expert` - For styling, animations, responsive
- `prisma-expert` - For database queries, migrations
- `sandbox-expert` - For sandbox operations, providers

### Hooks Behavior

| Trigger | Command | Description |
|---------|---------|-------------|
| Write/Edit | `pnpm prettier --write` | Format code |
| Write/Edit | `pnpm eslint --fix` | Fix lint issues |
| Write/Edit | `timeout 60 pnpm tsc` | Type check (incremental) |
| Stop | `pnpm build` | Verify build |

## Project Structure

```
.claude/
├── hooks.json           # PostToolUse and Stop hooks
├── AGENTS.md            # Agent configuration
├── settings.local.json  # Permissions
└── agents/skills/       # Domain-specific skills
    ├── nextjs-expert/
    ├── react-expert/
    ├── typescript-expert/
    ├── tailwind-expert/
    ├── prisma-expert/
    └── sandbox-expert/

.omc/
├── project-memory.json  # Auto-detected tech stack
├── notepad.md          # Working memory
├── ENGINEERING.md      # This file
└── state/
    ├── project.json    # Project phases
    └── active-session.json

.config/
└── app.config.ts       # Central app configuration
```

## Commands

### Development
```bash
pnpm dev              # Dev server with Turbopack
pnpm build            # Production build
pnpm lint             # ESLint check
```

### Testing
```bash
pnpm run test:api     # API endpoint tests
pnpm run test:code    # Code execution tests
pnpm run test:all     # All tests
```

### Database
```bash
npx prisma generate   # Generate client
npx prisma migrate dev # Create migration
npx prisma studio     # Open Prisma Studio
```

## Hot Paths (High Traffic)

1. `components/shared/pixi/Pixi.tsx` (11 accesses)
2. `components/shared/header/BrandKit/BrandKit.tsx` (4 accesses)
3. `lib/session-store.ts` (4 accesses)
4. `lib/request-context.ts` (3 accesses)

## Critical Files

- `lib/sandbox/factory.ts` - Sandbox abstraction
- `lib/ai/provider-manager.ts` - Multi-provider AI
- `config/app.config.ts` - App configuration
- `app/api/create-ai-sandbox/route.ts` - Sandbox API

## Security Considerations

- All API routes need auth checks
- Sandbox commands are sandboxed but validate inputs
- Firecrawl API key required for scraping
- Environment variables in `.env.local`

## Environment Variables

Required:
```
FIRECRAWL_API_KEY=
GEMINI_API_KEY= (or ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY)
SANDBOX_PROVIDER=vercel|e2b
VERCEL_TOKEN= (or VERCEL_OIDC_TOKEN)
DATABASE_URL= (Neon connection string)
```

## Next Steps

1. ✅ OMC hooks configured
2. ✅ Skills installed
3. ✅ State management active
4. ✅ Notepad initialized
5. ✅ Agent routing configured

The platform is now fully engineered with OMC tooling.
