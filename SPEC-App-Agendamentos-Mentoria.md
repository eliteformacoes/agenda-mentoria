# Spec — App de Agendamentos da Mentoria (handoff Claude Code)

App **standalone** (login próprio) pra o SDR/closer gerenciarem os agendamentos das reuniões estratégicas da mentoria. Separado do CRM, mas no **mesmo Supabase** (schema novo). Construir via Claude Code.

_Criado no Cowork em 30/06/2026. Protótipo visual: `EliteCRM/painel-agendamentos.html`._

---

## 1. Escopo

**v1 (fazer primeiro — o mínimo já útil):**
- Login/senha (Supabase Auth).
- Uma tela: **tabela de agendamentos** com cliente, data da reunião, **lead score**, status, etapas enviadas (confirmação, lembrete), closer, link do formulário.
- **Ações por linha:** marcar **Realizado / No-show / Remarcar** (grava no banco, com histórico).
- KPIs no topo (agendados, realizados, no-show, taxa de comparecimento) e **filtro por status**.

> **Agora é 1 closer / 1 conta** — sem divisão por usuário nem filtro por closer. Login único. (Multi-closer fica pra v2.)

**v2 (backlog, depois):**
- Integração mais profunda com Calendly (hoje o dado já chega via n8n).
- Configurar **lembretes e follow-ups** automáticos — reaproveitar `crm.esteiras_followup` + `esteiras_followup_templates` e o pipeline de WhatsApp do CRM.
- Relatórios / histórico por período e por closer.
- **Multi-closer:** login por usuário, RLS por `closer`, atribuição e filtro por closer (quando o time crescer).

## 2. Arquitetura

- **Frontend:** Vite + React (mesma stack do CRM). App próprio, repositório novo.
- **Banco + Auth:** **Supabase do CRM** (projeto `gllpdyeavqxcoocjddyt`), **schema novo `agenda`**. Auth por email/senha — **1 conta por ora** (multi-usuário depois).
- **Deploy:** Vercel/Netlify.
- Por estar no mesmo Supabase, o app enxerga dados do CRM (lead score, alunos, esteiras de follow-up) sem integração extra — mas com login e telas próprios.

## 3. Fonte de dados / ingestão

Fluxo atual (manter): **Typeform → n8n → planilha** (dados + lead score) e **Calendly → n8n → planilha** (atualiza a data agendada). Aba da planilha: **"mentoria"**.

**Mudança mínima:** o n8n passa a gravar também numa tabela `agenda.agendamentos` (nó Postgres/Supabase, ao lado do nó da planilha — pode manter os dois no começo). Upsert por um identificador estável (email ou id do Calendly).

> **Claude Code:** ler as **colunas reais** da aba "mentoria" (ou da planilha via conector) e mapear 1:1 para a tabela. O modelo abaixo é o alvo — ajustar os nomes conforme a planilha.

## 4. Modelo de dados (alvo — ajustar às colunas reais)

`agenda.agendamentos`:
- `id` uuid pk
- `nome`, `email`, `telefone`
- `produto` (ex.: mentoria)
- `lead_score` int
- `form_url` text (link do Typeform com as respostas) · `respostas` jsonb (se disponível)
- `calendly_event_id` text · `calendly_link` text
- `data_agendada` timestamptz (a data escolhida no Calendly)
- `closer` text/uuid (responsável)
- `status` text: `agendado` | `realizado` | `no_show` | `remarcar` (default `agendado`)
- `confirmacao_enviada` bool · `lembrete_enviado` bool
- `created_at`, `updated_at`
- histórico: tabela `agenda.agendamento_status_log` (agendamento_id, status, por_usuario, em) — append-only.

RLS: ativar. Ver decisão de acesso na seção 6.

## 5. Telas (v1)

Uma tela principal, no **layout do protótipo** (`painel-agendamentos.html`):
- Faixa de **KPIs**.
- **Filtros**: status (todos/agendado/realizado/no-show/remarcar).
- **Tabela**: Cliente (nome + produto) · Reunião (data/hora) · Score (badge por faixa) · Status (chip) · Confirmação (✓/–) · Lembrete (✓/–) · Form (link) · Ações (Realizou / No-show / Remarcar). _(Coluna Closer: opcional, oculta no v1.)_
- Ação grava status + escreve no log.

## 6. Design

**Usar o design system do CRM** (tema editorial escuro + dourado). Tokens em `crm-connect/docs/design-system/tokens.css`:
- Fundo `#0A0A0A`/`#111110`; linhas `#2A2920`; texto `#F2EDE3`/`#B8B0A0`; acento dourado `#CC9346`/`#E6C88C`.
- Semânticas: positivo `#7ECB57`, negativo `#F26B4D`, azul `#6FB4FF`.
- Fontes: Bricolage Grotesque (display), Inter (sans), JetBrains Mono (números/labels).
- O protótipo `painel-agendamentos.html` já aplica esse padrão — usar como referência de UI.

## 7. Decisões de produto

1. **Acesso:** por ora **1 closer, 1 conta** — sem divisão por usuário, sem filtro por closer, sem RLS por closer. Login único. O campo `closer` fica no banco (opcional) pra quando o time crescer (v2).
2. **Fonte do "confirmação/lembrete enviado":** se a planilha/n8n já marca, mapear; senão, começa manual e automatiza na v2.

## 8. Passo a passo sugerido (Claude Code)

1. Ler as colunas reais da aba "mentoria" e finalizar o modelo `agenda.agendamentos` (+ log).
2. Criar o schema/tabelas no Supabase (migration) e importar a planilha atual (carga inicial).
3. Ajustar o n8n pra gravar em `agenda.agendamentos` (upsert).
4. Scaffold do app (Vite+React+Supabase Auth) com a tela única + ações, aplicando os tokens do CRM.
5. Deploy + criar **o usuário** (login único por ora).

v2 depois: Calendly deep-sync, lembretes/follow-ups (esteiras), relatórios.
