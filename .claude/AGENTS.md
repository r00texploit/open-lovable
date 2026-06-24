# OMC Agent Configuration - Noeron

## Available Agents

Located in `.claude/agents/skills/`:

| Agent | Purpose | Usage |
|-------|---------|-------|
| **nextjs-expert** | Next.js App Router patterns | API routes, SSR, caching |
| **react-expert** | Component patterns & hooks | Compound components, performance |
| **typescript-expert** | Type safety & patterns | Generics, type guards, utilities |
| **tailwind-expert** | Styling & design system | Custom config, utilities |
| **prisma-expert** | Database & ORM | Schema design, queries, migrations |
| **sandbox-expert** | Sandbox abstraction | Vercel/E2B sandbox operations |

## Global Agents (from ~/.claude/agents/)

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **planner** | Implementation planning | Complex features, refactors |
| **architect** | System design | Architectural decisions |
| **tdd-guide** | Test-driven development | New features, bug fixes |
| **code-reviewer** | Code review | After writing code |
| **security-reviewer** | Security analysis | Before commits |
| **build-error-resolver** | Fix build errors | When build fails |
| **e2e-runner** | E2E testing | Critical user flows |
| **refactor-cleaner** | Dead code cleanup | Code maintenance |

## Agent Routing Rules

```markdown
# Automatic Delegation (No user prompt needed)

1. Complex feature requests → Use **planner** agent
2. Code just written/modified → Use **code-reviewer** agent
3. Bug fix or new feature → Use **tdd-guide** agent
4. Architectural decision → Use **architect** agent
5. TypeScript errors → Use **typescript-expert** skill
6. Database issues → Use **prisma-expert** skill
7. Component design → Use **react-expert** skill
8. Styling issues → Use **tailwind-expert** skill
```

## Parallel Execution

**ALWAYS** use parallel agent execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Security analysis of auth module
2. Performance review of cache system
3. Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker

## Project-Specific Context

**Noeron Tech Stack:**
- Next.js 15 (App Router, Turbopack)
- React 19 (Concurrent features)
- TypeScript 5 (Strict mode)
- Tailwind CSS 3.4
- Prisma + Neon (Serverless PostgreSQL)
- Vercel Sandbox / E2B (Code execution)

**Hot Paths:**
- `components/shared/pixi/Pixi.tsx`
- `components/shared/header/BrandKit/BrandKit.tsx`
- `lib/session-store.ts`
- `lib/sandbox/factory.ts`

**Critical APIs:**
- `app/api/create-ai-sandbox/route.ts`
- `app/api/generate-ai-code-stream/route.ts`
- `app/api/apply-ai-code-stream/route.ts`
