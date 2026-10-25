# Agentic IGA

An Agentic Identity Governance and Administration (IGA) system built with Node.js, TypeScript, Fastify, Prisma, and PostgreSQL. This application processes Joiner/Mover/Leaver (JML) events through an AI-powered orchestration layer with human-in-the-loop (HITL) approvals for sensitive provisioning requests.

## Features

- **HR Webhook Processing** - Accepts HR events to trigger provisioning workflows
- **AI-Powered Orchestration** - Analyzes events and determines provisioning actions with risk scoring and SoD conflict detection
- **Pre-AI & Policy Vetoes** - Enforces pre-AI employee status checks and post-AI policy veto rules before provisioning
- **Human-in-the-Loop Approvals** - Pending high-risk requests require manual approval/rejection
- **Audit Logging** - Full audit trail of all provisioning actions
- **Web UI** - Simple dashboard for reviewing approvals and audit logs
- **REST API** - Endpoints for webhooks, approvals, and audit logs

## Tech Stack

- [Fastify](https://fastify.dev/) - Web framework
- [Prisma](https://www.prisma.io/) - ORM (v7 with PostgreSQL)
- [PostgreSQL](https://www.postgresql.org/) - Database
- [TypeScript](https://www.typescriptlang.org/)
- [OpenAI-compatible API](https://platform.openai.com/docs/api-reference) - For AI orchestration (supports Ollama, OpenRouter, etc.)
- [Zod](https://zod.dev/) - Schema validation

## Getting Started

### Recommended: Using Docker (Easiest)

The easiest way to try this application is with Docker Compose. This will set up both the PostgreSQL database and the application automatically.

1. Clone the repository
2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
3. (Optional) Configure your AI model in `.env`. By default it uses Ollama at `http://localhost:11434/v1` with model `llama3.1`. You can change this to any OpenAI-compatible API.
4. Start the services:
   ```bash
   docker-compose up --build
   ```
5. The app will be available at [http://localhost:3000](http://localhost:3000)

The Docker setup will automatically:
- Start PostgreSQL with health checks
- Build and start the application
- Connect using the database credentials from `.env`

## Development Setup

If you want to develop locally without Docker:

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database running locally or remotely
- npm

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` in `.env` to point to your PostgreSQL instance.

3. Set up the database schema and seed test data:
   ```bash
   # Push the schema to the database
   npx prisma db push
   
   # Seed with test employees
   npm run prisma:seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at [http://localhost:3000](http://localhost:3000) with hot reload enabled.

### Other Useful Commands

```bash
# Build for production
npm run build

# Start production build
npm start

# Regenerate Prisma Client after schema changes
npx prisma generate
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/webhooks/hr` | Submit an HR event (JML) for processing |
| `GET` | `/api/approvals` or `/api/approvals/pending` | List pending approvals |
| `POST` | `/api/approvals/:id/approve` | Approve a provisioning request |
| `POST` | `/api/approvals/:id/reject` | Reject a provisioning request |
| `GET` | `/api/audit-logs` | View recent audit logs (last 100) |

### Example: HR Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/hr \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "11111111-1111-4111-8111-111111111111",
    "eventType": "PROMOTION",
    "hrPayload": {
      "newTitle": "Senior Frontend Engineer",
      "newDepartment": "Engineering"
    }
  }'
```

## Test Data

Running `npm run prisma:seed` will populate the database with 5 test employees:
- Alice Chen (Engineering, Junior Frontend Engineer) - ACTIVE
- Bob Martinez (Engineering, Senior Software Engineer) - ACTIVE
- Carol Danvers (DevOps, Site Reliability Engineer) - ACTIVE
- Charlie Davis (Sales, Account Executive) - TERMINATED
- Elena Rostova (External Audit, Security Consultant) - ACTIVE

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/agentic_iga?schema=public` |
| `POSTGRES_USER` | PostgreSQL user (for Docker) | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password (for Docker) | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name (for Docker) | `agentic_iga` |
| `OPEN_WEIGHT_LLM_URL` | OpenAI-compatible API endpoint | `http://localhost:11434/v1` |
| `OPEN_WEIGHT_LLM_KEY` | API key for the LLM | `ollama` |
| `OPEN_WEIGHT_MODEL` | Model name to use | `llama3.1` |

## AI Usage Disclosure

This project uses AI programmatically as part of its core functionality:

- **AI Client** (`src/config/aiClient.ts`): Configures an OpenAI-compatible client using environment variables (`OPEN_WEIGHT_LLM_URL`, `OPEN_WEIGHT_LLM_KEY`) to connect to LLM providers (e.g., Ollama, OpenRouter, Groq).
- **AI Governance Engine** (`src/services/aiEngine.ts`): Uses the AI client to generate governance plans for JML events. It sends structured prompts to the LLM with a JSON schema constraint, validates responses with Zod, and retries with corrective guidance if validation fails.
- **Orchestration** (`src/services/orchestrator.ts`): Integrates AI-generated governance plans into the provisioning workflow, applying policy checks and deciding whether actions require human approval (if risk score ≥ 0.7) or can be auto-executed.

## License

[MIT](LICENSE)
