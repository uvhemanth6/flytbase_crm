# FlytBase Customer Success CRM

A production-ready enterprise CRM dashboard built for the FlytBase Questathon challenge.

## Tech Stack
- **Next.js 15** with TypeScript and App Router
- **Tailwind CSS** for premium dark-navy UI
- **Server-side API routes** for secure MCP integration
- **Local JSON data store** with persistent caching
- **Vercel** deployment compatible

## Features

### Dashboard Sections (per account)
1. **Book Worth** – Deal values with verified/estimated/unverified breakdown and source IDs
2. **Power Map** – Decision-makers, budget owners, signatories, users, blockers
3. **Priority Actions** – Three ranked next-steps with owner, due date, deal affected
4. **Risk Radar** – Deadlines, stalled deals, stakeholder concerns
5. **Intelligence Gaps** – Missing info, why it matters, who can fill it

### MCP Integration
- Secure server-side proxy for `questathon.aihackerscollective.com` MCP API
- Rate-limit aware queue (1 call/min per token)
- Persistent JSON cache – no repeated fetches
- Supports: `whoami`, `get_my_accounts`, `get_file`, `get_all_paperwork`, `get_signals`, `get_data_format`, `get_flytbase_team`, `list_notes`, `write_note`

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/flytbase-crm.git
cd flytbase-crm
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your token:
```
AQ_TOKEN=your_actual_token_here
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel
```bash
npx vercel deploy
```
Add `AQ_TOKEN` as an Environment Variable in the Vercel dashboard.

## Security
- `AQ_TOKEN` is **only** read server-side via `process.env`
- Never exposed to the browser
- `.env.local` is git-ignored
- All MCP calls go through `/api/mcp` proxy

## Data Store
Fetched MCP data is cached in `data/cache.json` with timestamps.  
The rate-limit queue state lives in `data/queue.json`.  
Both files are git-ignored (see `.gitignore`).

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Redirect to /dashboard
│   ├── dashboard/
│   │   └── page.tsx            # Main portfolio overview
│   ├── accounts/
│   │   └── [id]/
│   │       └── page.tsx        # Per-account deep-dive
│   └── api/
│       ├── mcp/route.ts        # MCP proxy + queue
│       ├── accounts/route.ts   # Account summary API
│       ├── sync/route.ts       # Background sync trigger
│       └── notes/route.ts      # Write note API
├── components/
│   ├── Sidebar.tsx
│   ├── BookWorth.tsx
│   ├── PowerMap.tsx
│   ├── PriorityActions.tsx
│   ├── RiskRadar.tsx
│   └── IntelGaps.tsx
├── lib/
│   ├── mcp-client.ts           # MCP JSON-RPC client
│   ├── cache.ts                # Persistent JSON cache
│   ├── queue.ts                # Rate-limit queue
│   └── data-parser.ts          # Parse MCP responses → CRM schema
└── types/
    └── crm.ts                  # All TypeScript interfaces
data/
    cache.json                  # (git-ignored) Cached MCP data
    queue.json                  # (git-ignored) Queue state
```

## Accounts
- **Eastern Counties Police Alliance** – Public safety enterprise
- **Aldermoor Industrial Group** – Industrial enterprise

## License
MIT
