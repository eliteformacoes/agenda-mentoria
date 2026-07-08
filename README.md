# Painel de Agendamentos — Mentoria

App standalone (Vite + React + TS + Supabase) para o closer gerenciar as calls estratégicas da mentoria: agenda por data (Hoje/Amanhã/Próximos), banner de próxima call, filtro de status, detalhes do lead e marcação de status (Realizado / No-show / Remarcar / Cancelado) com log.

## Rodar local

```bash
npm install
# crie .env.local com as duas variáveis (veja .env.example)
npm run dev
```

`.env.local`:
```
VITE_SUPABASE_URL=https://gllpdyeavqxcoocjddyt.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do projeto>
```

Login: `agenda@eliteformacoes.com.br`.

## Deploy na Vercel

Framework detectado automaticamente (Vite). Build: `vite build` · Output: `dist`.

**Opção A — GitHub + Vercel (recomendado):**
1. Suba este repositório para o GitHub.
2. Vercel → Add New → Project → importe o repo.
3. Em Environment Variables, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

**Opção B — Vercel CLI:**
```bash
npm i -g vercel
vercel                      # segue os prompts (framework Vite detectado)
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

## Banco (Supabase — já configurado)

- Schema `agenda` com `agendamentos` + `agendamento_status_log`.
- RLS ligado (só usuário autenticado acessa).
- Schema `agenda` exposto na Data API.
- Ingestão pelo n8n: ver `docs/n8n-handoff.md`.

## Antes do go-live

Remover os registros de teste (DEV) que foram semeados para preview:
```sql
delete from agenda.agendamentos where id_contato like 'dev-%';
```
