# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Open Lovable is an AI-powered website builder that scrapes websites and rebuilds them as React applications. Users input a URL or describe what they want to build, and the AI generates a complete Vite + React + Tailwind CSS application running in a sandboxed environment.

**Tech Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Vercel Sandbox/E2B

## Development Commands

```bash
# Install dependencies (uses pnpm preferred, npm/yarn also supported)
pnpm install

# Start development server (uses Turbopack)
pnpm dev
# Server runs at http://localhost:3000

# Build for production
pnpm build

# Run ESLint
pnpm lint

# Run tests
pnpm run test:api      # API endpoint tests
pnpm run test:code     # Code execution tests
pnpm run test:all      # Run all tests
```

## Architecture Overview

### Frontend Structure

- **`/app/page.tsx`** - Landing page with URL input and style/model selection
- **`/app/builder/page.tsx`** - Main builder interface with chat, code editor, and live preview
- **`/app/layout.tsx`** - Root layout with Geist, Inter, and Roboto Mono fonts
- **`/components/shared/`** - Reusable UI components organized by feature
- **`/components/ui/shadcn/`** - Shadcn UI components (Button, Dialog, etc.)
- **`/components/app/(home)/`** - Landing page specific components

### Backend API Routes (`/app/api/`)

Key API endpoints:
- **`create-ai-sandbox`** - Creates Vercel/E2B sandbox with Vite React template
- **`generate-ai-code-stream`** - Streams AI-generated code from LLM providers
- **`apply-ai-code-stream`** - Applies code changes to sandbox with live preview updates
- **`get-sandbox-files`** - Retrieves file tree from sandbox
- **`run-command`** / **`run-command-v2`** - Executes commands in sandbox
- **`install-packages`** - Installs npm packages in sandbox
- **`scrape-website`** / **`scrape-url-enhanced`** - Scrapes URLs using Firecrawl
- **`extract-brand-styles`** - Extracts brand colors/styles from scraped content
- **`search`** - Web search for discovering websites

### Core Libraries (`/lib/`)

- **`sandbox/`** - Sandbox abstraction layer
  - `factory.ts` - Creates Vercel or E2B provider based on SANDBOX_PROVIDER env
  - `sandbox-manager.ts` - Singleton for managing sandbox lifecycle
  - `providers/vercel-provider.ts` - Vercel Sandbox implementation
  - `providers/e2b-provider.ts` - E2B Sandbox implementation
- **`ai/provider-manager.ts`** - Multi-provider AI SDK configuration (OpenAI, Anthropic, Google, Groq)
- **`edit-intent-analyzer.ts`** - Analyzes user chat messages to determine file edits needed
- **`context-selector.ts`** - Selects relevant files for AI context based on intent
- **`file-parser.ts`** - Parses and validates AI-generated code blocks

### Configuration

- **`/config/app.config.ts`** - Central application configuration including:
  - AI model defaults and available models
  - Sandbox timeouts and settings
  - UI behavior settings
  - File management config

### State Management

- **`/atoms/`** - Jotai atoms for global state (sheets, UI state)
- **Global variables** - Sandboxes are stored in `global.activeSandbox`, `global.sandboxState`

### Types (`/types/`)

- **`sandbox.ts`** - Sandbox state interfaces
- **`conversation.ts`** - Chat message types
- **`file-manifest.ts`** - File tracking for code generation

## Key Environment Variables

Create `.env.local` with:

```env
# Required
FIRECRAWL_API_KEY=           # For website scraping

# At least one AI provider
GEMINI_API_KEY=              # Recommended default
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=

# Sandbox (choose one provider)
SANDBOX_PROVIDER=vercel      # or 'e2b'

# Vercel Sandbox auth (choose one method):
# Method A: OIDC (run `vercel link` then `vercel env pull`)
VERCEL_OIDC_TOKEN=
# Method B: Personal Access Token
VERCEL_TOKEN=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=

# Optional: Morph for faster edits
MORPH_API_KEY=
```

## Code Patterns

### Adding a New AI Model

Edit `/config/app.config.ts`:
1. Add model ID to `availableModels` array
2. Add display name to `modelDisplayNames`
3. If using custom provider config, add to `modelApiConfig`

### Creating New API Routes

Follow the pattern in existing routes:
- Use `NextResponse` from `next/server`
- Access global sandbox via `global.activeSandbox`
- Return JSON with `{ success: boolean, ...data }`

### Sandbox Operations

Always use the sandbox abstraction:
```typescript
import { SandboxFactory } from '@/lib/sandbox/factory';
const provider = SandboxFactory.create();
await provider.createSandbox();
await provider.writeFile('src/App.jsx', content);
```

### Component Structure

Components follow path-based organization:
- `/components/app/(home)/sections/hero/` - Hero section components
- `/components/shared/header/` - Shared header components
- `/components/shared/effects/` - Animation/visual effects

## ESLint Configuration

See `eslint.config.mjs`. Key rules:
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- `react-hooks/exhaustive-deps`: warn
- `prefer-const`: warn

## Tailwind Configuration

See `tailwind.config.ts`:
- Custom font sizes with specific line heights (e.g., `text-title-h1`)
- Extended colors from `colors.json` mapped to CSS variables
- Custom utilities: `center-x`, `center-y`, `flex-center`, `overlay`
- Custom sizing from 0-1000px with pixel values

## Important Notes

- Sandboxes run Vite React apps on port 3000 (Vercel) or 5173 (E2B)
- File changes are tracked in `global.existingFiles` to handle updates vs new files
- The builder uses streaming for real-time code generation and preview updates
- Brand styles are extracted and cached per session
- Truncation recovery is disabled by default (too many false positives)
