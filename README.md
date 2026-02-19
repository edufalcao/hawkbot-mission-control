# 🦅 HawkBot Mission Control

> Dashboard de gestão de agentes para o OpenClaw — Tasks, Calendar, Memory, Team e Office em uma única interface.

Built with **Nuxt 3** + **Nuxt UI** + **TanStack Query** + **SQLite/Drizzle ORM**, conectado ao **OpenClaw Gateway** via WebSocket.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Nuxt 3 |
| UI Components | Nuxt UI |
| Data Fetching | TanStack Query (`@tanstack/vue-query`) |
| State | Pinia |
| Styling | TailwindCSS (via Nuxt UI) |
| API/Backend | Nitro (built-in Nuxt) |
| Database | SQLite + Drizzle ORM (`better-sqlite3`) |
| Realtime | WebSocket → OpenClaw Gateway + SSE |

---

## Features

- **Tasks Board** — Kanban com 4 colunas: To Do, In Progress, Review, Done. Assignee por agente ou usuário.
- **Calendar** — Visualização de todos os cron jobs do OpenClaw Gateway.
- **Memory** — Browser visual para todos os arquivos de memória do workspace (`.md`), com busca.
- **Team** — Roster de agentes com status em tempo real, model, especialidades e estatísticas.
- **Office** — Visualização gamificada dos agentes trabalhando em seus desktops.
- **Content Pipeline** — *(Phase 2)* Pipeline de criação de conteúdo: Idea → Script → Thumbnail → Published.
- **Live Feed** — Stream de eventos em tempo real via SSE conectado ao Gateway.

---

## Pré-requisitos

- Node.js v18+
- pnpm v8+
- [OpenClaw](https://github.com/openclaw/openclaw) instalado e gateway rodando

---

## Setup

```bash
# Clone
git clone <repo-url>
cd hawkbot-mission-control

# Instalar dependências (inclui compilar better-sqlite3)
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com a URL e token do seu gateway
```

### Variáveis de ambiente

```env
# URL do OpenClaw Gateway (WebSocket)
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789

# Token de autenticação do Gateway
# Encontrado em: ~/.openclaw/openclaw.json → gateway.auth.token
OPENCLAW_GATEWAY_TOKEN=seu-token-aqui

# Caminho do banco de dados SQLite
DATABASE_PATH=./data/mission-control.db

# Caminho do workspace do OpenClaw
WORKSPACE_PATH=/Users/seu-usuario/.openclaw/workspace
```

---

## Rodar

```bash
# Dev (porta 4000)
pnpm dev
# → http://localhost:4000

# Build para produção
pnpm build

# Preview do build
pnpm preview

# Rodar em produção com PM2
pm2 start "pnpm preview" --name mission-control
```

---

## Estrutura

```
hawkbot-mission-control/
├── app/
│   ├── pages/              # Rotas: tasks, calendar, memory, team, office, content
│   ├── components/
│   │   ├── tasks/          # TaskCard, TaskCreateModal
│   │   └── NavItem.vue     # Sidebar navigation item
│   ├── layouts/
│   │   └── default.vue     # Layout com sidebar
│   └── plugins/
│       └── vue-query.ts    # TanStack Query setup
├── server/
│   ├── api/
│   │   ├── tasks/          # CRUD de tasks (GET, POST, PATCH, DELETE)
│   │   ├── calendar/       # Cron jobs do Gateway
│   │   ├── memory/         # Browser de arquivos .md do workspace
│   │   ├── team/           # Agentes (team members)
│   │   └── activity/       # Log de atividade + SSE stream
│   ├── db/
│   │   ├── schema.ts       # Schema Drizzle (tasks, content, team, activity)
│   │   └── index.ts        # Conexão SQLite + migrations automáticas
│   ├── plugins/
│   │   └── startup.ts      # Inicialização: conecta gateway, seed team
│   └── utils/
│       ├── gateway.ts      # WebSocket client + SSE broadcast
│       └── seed.ts         # Seed dos agentes padrão
├── data/                   # SQLite database (gitignored)
├── .env.example
└── nuxt.config.ts
```

---

## Agentes padrão (auto-seeded)

| Agente | Role | Model | Especialidade |
|--------|------|-------|--------------|
| 🦅 HawkBot | assistant | sonnet | Orquestração, planejamento, memória |
| 💻 Dev Agent | developer | sonnet | JS, Nuxt, TypeScript, Node |
| 🔍 Research Agent | researcher | gemini-flash | Web search, análise |
| ⚙️ Ops Agent | operator | minimax | Cron, monitoring, infra |
| ✍️ Writer Agent | writer | sonnet | Docs, relatórios, posts |

---

## Docker *(em breve)*

```bash
docker compose up -d
```

---

## Roadmap

- [x] Tasks Board (Kanban)
- [x] Calendar (cron jobs sync)
- [x] Memory browser (workspace .md files)
- [x] Team view (agents)
- [x] Office view (gamificado)
- [x] Live Feed (SSE)
- [ ] Content Pipeline (Phase 2)
- [ ] Drag-and-drop no Kanban (Phase 2)
- [ ] Notificações Telegram ao mover tasks (Phase 2)
- [ ] Docker Compose (Phase 3)

---

*Parte do projeto [Mission Control](https://x.com/AlexFinn/status/2024169334344679783) — inspirado por Alex Finn (@AlexFinn)*
