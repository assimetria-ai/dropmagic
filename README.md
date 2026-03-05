# DropMagic

Launch your next product drop with countdown pages, email captures, and viral share mechanics.

Built with React (Vite) + Node.js/Express + PostgreSQL + shadcn/ui

## Tech Stack

- **Client**: React 18 + Vite + shadcn/ui + lucide-react + Tailwind CSS
- **Server**: Node.js + Express + PostgreSQL (pg-promise)
- **Auth**: JWT sessions
- **Payments**: Stripe

## Structure

```
product-template/
├── client/          # React (Vite) frontend
├── server/          # Node.js/Express backend
├── docs/            # Architecture & runbooks
└── scripts/         # Dev & deploy utilities
```

## Quick Start

```bash
# Server
cd server && npm install && npm run dev

# Client
cd client && npm install && npm run dev
```

## Conventions

- `@system` — core template code (do not modify)
- `@custom` — product-specific code (your additions go here)
