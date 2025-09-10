# Open Lovable

Chat with AI to build React apps instantly. An example app made by the [Firecrawl](https://firecrawl.dev/?ref=open-lovable-github) team. For a complete cloud solution, check out [Lovable.dev ❤️](https://lovable.dev/).

Supports both **E2B** and **Vercel** sandboxes for code execution. Choose your preferred sandbox provider in the setup below.

<img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZtaHFleGRsMTNlaWNydGdianI4NGQ4dHhyZjB0d2VkcjRyeXBucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZFVLWMa6dVskQX0qu1/giphy.gif" alt="Open Lovable Demo" width="100%"/>



## Setup

1. **Clone & Install**
```bash
git clone https://github.com/mendableai/open-lovable.git
cd open-lovable
pnpm install  # or npm install / yarn install
```

2. **Add `.env.local`**

```env
# Required
FIRECRAWL_API_KEY=your_firecrawl_api_key  # Get from https://firecrawl.dev (Web scraping)

# =================================================================
# SANDBOX PROVIDER - Choose ONE: E2B or Vercel
# =================================================================

# Optional: Specify sandbox provider (defaults to 'e2b' if not set)
# SANDBOX_PROVIDER=e2b  # or 'vercel'

# -----------------------------------------------------------------
# OPTION 1: E2B Sandbox
# -----------------------------------------------------------------
# Get your API key from: https://e2b.dev
E2B_API_KEY=your_e2b_api_key

# -----------------------------------------------------------------
# OPTION 2: Vercel Sandbox
# -----------------------------------------------------------------
# Method 1: OIDC Token (automatic setup)
# Run `vercel link` then `vercel env pull` to get VERCEL_OIDC_TOKEN automatically
# VERCEL_OIDC_TOKEN=auto_generated_by_vercel_env_pull

# Method 2: Personal Access Token (manual setup)
# VERCEL_TEAM_ID=team_xxxxxxxxx      # Your Vercel team ID
# VERCEL_PROJECT_ID=prj_xxxxxxxxx    # Your Vercel project ID
# VERCEL_TOKEN=vercel_xxxxxxxxxxxx   # Personal access token from Vercel dashboard
# See: https://vercel.com/docs/vercel-sandbox#authentication

# =================================================================
# AI PROVIDERS - Add at least one
# =================================================================
ANTHROPIC_API_KEY=your_anthropic_api_key  # Get from https://console.anthropic.com
OPENAI_API_KEY=your_openai_api_key        # Get from https://platform.openai.com (GPT-5)
GEMINI_API_KEY=your_gemini_api_key        # Get from https://aistudio.google.com/app/apikey
GROQ_API_KEY=your_groq_api_key            # Get from https://console.groq.com (Fast inference)
```

3. **Run**
```bash
pnpm dev  # or npm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Sandbox Providers

Open Lovable supports two sandbox providers for code execution:

### 🔧 E2B
- **Full-featured development environment** with Node.js, npm, and pre-installed tools
- **Persistent file system** across interactions
- **Fast startup** and reliable performance
- **Advanced debugging** capabilities
- Perfect for complex applications and debugging

### ⚡ Vercel
- **Vercel-hosted sandboxes** with automatic scaling
- **Integrated with Vercel ecosystem** for seamless deployment
- **Automatic OIDC authentication** (run `vercel link` then `vercel env pull`)
- Great for **production workflows** and Vercel users

### Choosing Your Provider

- **Use E2B** if you need full development capabilities and debugging features
- **Use Vercel** if you're already in the Vercel ecosystem or prefer their hosted solution
- **Default**: E2B (if no `SANDBOX_PROVIDER` is specified)

You can switch providers anytime by updating the `SANDBOX_PROVIDER` environment variable.  

## License

MIT
