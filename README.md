# Noeron

Chat with AI to build React apps instantly. An example app made by the [Firecrawl](https://firecrawl.dev/?ref=noeron-github) team. For a complete cloud solution, check out [Lovable.dev](https://lovable.dev/) ❤️.

<img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZtaHFleGRsMTNlaWNydGdianI4NGQ4dHhyZjB0d2VkcjRyeXBucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZFVLWMa6dVskQX0qu1/giphy.gif" alt="Noeron Demo" width="100%"/>

## Setup

1. **Clone & Install**
```bash
git clone https://github.com/firecrawl/noeron.git
cd noeron
pnpm install  # or npm install / yarn install
```

2. **Add `.env.local`**

```env
# =================================================================
# REQUIRED
# =================================================================
FIRECRAWL_API_KEY=your_firecrawl_api_key    # https://firecrawl.dev

# =================================================================
# AI PROVIDER - Choose your LLM
# =================================================================
GEMINI_API_KEY=your_gemini_api_key        # https://aistudio.google.com/app/apikey
ANTHROPIC_API_KEY=your_anthropic_api_key  # https://console.anthropic.com
OPENAI_API_KEY=your_openai_api_key        # https://platform.openai.com
GROQ_API_KEY=your_groq_api_key            # https://console.groq.com

# =================================================================
# FAST APPLY (Optional - for faster edits)
# =================================================================
MORPH_API_KEY=your_morphllm_api_key    # https://morphllm.com/dashboard

# =================================================================
# SANDBOX PROVIDER - VPS is the production default
# =================================================================
SANDBOX_PROVIDER=vps

VPS_AGENT_URL=http://127.0.0.1:3001
VPS_AGENT_TOKEN=replace_with_a_random_32_character_secret
VPS_BASE_DOMAIN=example.com
VPS_PUBLIC_IP=203.0.113.10
VPS_DEPLOYMENTS_ENABLED=true

# Optional compatibility provider: Vercel Sandbox
# Choose one authentication method:

# Method A: OIDC Token (recommended for development)
# Run `vercel link` then `vercel env pull` to get VERCEL_OIDC_TOKEN automatically
VERCEL_OIDC_TOKEN=auto_generated_by_vercel_env_pull

# Method B: Personal Access Token (for production or when OIDC unavailable)
# VERCEL_TEAM_ID=team_xxxxxxxxx      # Your Vercel team ID 
# VERCEL_PROJECT_ID=prj_xxxxxxxxx    # Your Vercel project ID
# VERCEL_TOKEN=vercel_xxxxxxxxxxxx   # Personal access token from Vercel dashboard

# Optional compatibility provider: E2B Sandbox
# E2B_API_KEY=your_e2b_api_key      # https://e2b.dev
```

3. **Run**
```bash
pnpm dev  # or npm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## License

MIT
