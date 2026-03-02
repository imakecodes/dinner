# POE2 Genie ⚔️
**Planeje builds melhores para sua Party no Hideout.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.x-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%20API-orange)

**POE2 Genie** é um assistente inteligente para Path of Exile 2, criado para planejar builds melhores. Ele combina perfis de Party no Hideout, controle de Stash, gestão de Checklist e um estrategista de builds com IA para transformar seus recursos em builds práticas e personalizadas.

---

## ✨ Funcionalidades

### 🧠 Estrategista IA de Builds
*   **Craft Inteligente**: Cria builds práticas com base no que você *realmente* tem no Stash.
*   **Foco na Party**: Respeita restrições da Party, archetypes preferidos e tempo de setup.
*   **Planejamento por Custo**: Suporta tiers de custo, de setups baratos até planejamento mirror-level.
*   **Tradução Global**: Traduza instantaneamente qualquer build para seu idioma (Português/Inglês).
*   **Validação Factual Determinística**: Faz grounding dos termos do usuário em entidades canônicas de PoE2 antes de interpretar mecânicas.

### 🏠 Hideouts Conectados
*   **Sincronia da Party**: Convide amigos para o Hideout e compartilhe o contexto.
*   **Gestão Compartilhada**: Todos veem o mesmo Stash e Checklist.
*   **Controle de Acesso**: Gerencie permissões com funções de Party Leader e Party Member.

### 🛒 Fluxo de Checklist
*   **Fluxo Contínuo**: Adicione Gear/Gems faltantes das builds direto no Checklist.
*   **Status Claro**: Organize itens nas abas Pending e Completed.
*   **Compartilhamento Fácil**: Copie itens filtrados do Checklist para WhatsApp ou texto.

### 📦 Controle de Stash
*   **Inventário na Mão**: Mantenha visibilidade completa do que já existe no Stash.
*   **Import por Colar**: Importe conteúdo de item copiado do Path of Exile 2 direto para o Stash.
*   **Sugestões Inteligentes**: A IA prioriza o que você já possui antes de sugerir novos itens.

---

## 🛠️ Stack Tecnológica

Construído com tecnologias web modernas para performance e escala:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
*   **Banco de Dados**: [MariaDB](https://mariadb.org/) & [Prisma ORM](https://www.prisma.io/)
*   **Motor de IA**: [Google Gemini API](https://deepmind.google/technologies/gemini/) (modelos configuráveis)
*   **Estilização**: [TailwindCSS](https://tailwindcss.com/)
*   **Autenticação**: JWT próprio com fluxo seguro de recuperação de senha.
*   **Infraestrutura**: Pronto para Docker & Docker Compose.

---

## 🚀 Como Começar

### Pré-requisitos
*   Node.js 18+
*   Docker & Docker Compose (para o banco de dados)
*   Chave de API do Google Gemini

### Início Rápido (Desenvolvimento)

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/DefRuivo/POE2_Genie.git
    cd POE2_Genie
    ```

2.  **Configure o ambiente**:
    ```bash
    cp .env-sample .env
    # Edite o .env com sua GEMINI_API_KEY e credenciais do banco
    ```
    Mantenha `GEMINI_MODEL_FALLBACK` em um modelo compatível com `generateContent` (recomendado: `gemini-2.5-flash`).
    `AI_CONTEXT_FILE_PATH` é opcional. Se estiver ausente ou apontar para arquivo inexistente, o runtime usa fallback para `.ai/ai-context.template.md`.
    Crie `.ai/ai-context.local.md` somente quando precisar de overrides locais de prompt.
    A validação factual por padrão roda em modo estrito (`POE_FACT_VALIDATION_MODE=strict`) e pode retornar `422 gemini.fact_unverified` quando claims críticos continuam sem verificação após um retry corretivo. Em indisponibilidade de fonte, o padrão é `POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY=degrade_warn` (output com incerteza explícita); use `fail_503` para bloquear com `503 gemini.official_sources_unavailable`.
    Termos críticos sem confirmação agora retornam `422 gemini.term_unverified` no modo estrito.
    Ajuste o lookup com `POE_KNOWLEDGE_CACHE_TTL_MIN`, `POE_KNOWLEDGE_FETCH_TIMEOUT_MS` e `POE_KNOWLEDGE_LOOKUP_MODE` (`snapshot_first`, `snapshot_only`, `online_first`).
    Controles do snapshot semanal: `ENABLE_POE_SNAPSHOT_CRON`, `POE_SNAPSHOT_CRON_SCHEDULE`, `POE_SNAPSHOT_MAX_PAGES_PER_RUN`.

3.  **Inicie o banco de dados**:
    ```bash
    docker compose up -d
    ```

4.  **Instale dependências e envie o schema**:
    ```bash
    pnpm install
    pnpm db:push
    ```
    Para mudanças de produção, gere/aplique migrations Prisma em vez de depender apenas de `db:push`.

5.  **Rode a aplicação**:
    ```bash
    pnpm dev
    ```

Acesse `http://localhost:3000` e comece a craftar builds.

---

## 🧾 Snapshot de Evidência PoE

O resolvedor de conhecimento suporta snapshots locais semanais para reduzir dependência de disponibilidade online.

*   **Dados do Snapshot**: Salvos nas tabelas Prisma `PoeSnapshotRun`, `PoeEntitySnapshot` e `PoeAliasSnapshot`.
*   **Modo Padrão de Lookup**: `snapshot_first` (snapshot local primeiro, depois providers oficiais).
*   **Agendamento do Cron**: Semanal na segunda-feira às 03:00 por padrão (`0 3 * * 1`).
*   **Providers**: `poe2db.tw` e `poe2wiki.net`.

---

## 🧭 Rotas Canônicas

*   `/hideouts`
*   `/party`
*   `/builds`
*   `/stash`
*   `/checklist`

---

## 🔒 Security Checks

Referências de política de segurança e CI:

*   [CI Security Checks](docs/ci-security-checks.md)
*   [Guia de Migração Canônica](MIGRATION.md)

---

## 🤝 Contribuição

Contribuições são bem-vindas. Seja corrigindo um bug ou adicionando uma nova funcionalidade de planejamento de builds, sinta-se à vontade para abrir um Pull Request.

## 📄 Licença

Este projeto é open source e está disponível sob a [Licença MIT](LICENSE).
