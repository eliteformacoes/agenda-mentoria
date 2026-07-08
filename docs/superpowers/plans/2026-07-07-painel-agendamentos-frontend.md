# Painel de Agendamentos da Mentoria — Plano de Implementação (Frontend)

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA — usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** App web standalone (login próprio) para o closer gerenciar os agendamentos das calls estratégicas da mentoria — KPIs, filtro por status, tabela e ações (Realizado / No-show / Remarcar) gravando status + log no Supabase.

**Arquitetura:** SPA em Vite + React + TS. Fonte de dados = Supabase (schema `agenda`, já criado). O app lê `agenda.agendamentos` e grava status via RPC atômica (`agenda.marcar_status`) que também escreve no log append-only. A tabela é preenchida pelo n8n (em paralelo, fora deste plano); o app não importa dados históricos. Camada de dados isolada num único módulo (`lib/agendamentos.ts`) — se um dia a fonte mudar, muda só esse arquivo.

**Tech Stack:** Vite 5, React 18, TypeScript, @supabase/supabase-js v2, Vitest (testes de lógica pura). Sem router (troca Login↔Painel por estado de sessão). Deploy Vercel.

---

## Contexto travado (decisões já tomadas)

| Tema | Decisão |
|---|---|
| Fonte de dados | Supabase `agenda.agendamentos` (n8n preenche; **sem import histórico**) |
| Quem aparece no painel | Só quem tem `data_agendada` preenchida (reunião marcada) |
| Produto | Fixo `"Mentoria"` (não há coluna de produto) |
| Status (4 chips) | de-para de `status_origem` → `status` (ver `lib/mapeamento.ts`) |
| Badge lead score | 🟢 `≥8` · 🟡 `5–7` · ⚪ `<5` (inclui negativos) |
| Datas | Armazenadas `timestamptz` (−03); exibidas em horário de Brasília |
| Auth | 1 conta, email/senha (Supabase Auth) |
| Dev/preview | Seed **sintético pequeno** (~15 linhas fake), removível com `truncate` |

### De-para de status (fonte → chip)
| `status_origem` (planilha/n8n) | `status` (app) |
|---|---|
| Call agendada · Call confirmada | `agendado` |
| Call realizada · Venda realizada | `realizado` |
| No-show | `no_show` |
| Call reagendada · Call cancelada | `remarcar` |
| Não agendada · (vazio) | `nao_agendada` (fica fora do painel) |

### Mapeamento coluna do banco → elemento da tela
| Coluna `agenda.agendamentos` | Onde aparece na UI |
|---|---|
| `nome` + produto fixo "Mentoria" | Célula **Cliente** (nome + subtítulo) |
| `data_agendada` | Célula **Reunião** (dd/MM HH:mm) |
| `lead_score` | Badge **Score** (cor por faixa) |
| `status` | **Chip** de status |
| `confirmacao_enviada` | Coluna **Confirm.** (✓/–) |
| `lembrete_enviado` | Coluna **Lembrete** (✓/–) |
| `closer` | Coluna **Closer** |
| `form_url` | Link **ver form ↗** |
| `id` + ação | Botões **Realizou / No-show / Remarcar** |
| lista inteira | **KPIs** (Agendados, Realizados, No-show, Comparecimento) |

---

## Estrutura de arquivos

```
MentoriaCRM/
  index.html
  package.json
  tsconfig.json  tsconfig.node.json
  vite.config.ts
  .gitignore  .env.example  .env.local (gitignored)
  README.md
  docs/
    n8n-handoff.md            # contrato de upsert p/ o n8n (fora do código)
  src/
    main.tsx
    vite-env.d.ts
    lib/
      supabase.ts             # client (schema 'agenda')
      types.ts                # Agendamento, Status
      mapeamento.ts           # de-para status, faixa score, produto, format data
      kpis.ts                 # cálculo dos KPIs
      agendamentos.ts         # camada de dados: listar + marcarStatus (rpc)
    auth/
      AuthProvider.tsx        # contexto de sessão
      Login.tsx               # tela de login
    components/
      Kpis.tsx
      Filtros.tsx
      TabelaAgendamentos.tsx
      LinhaAgendamento.tsx
      ScoreBadge.tsx
      StatusChip.tsx
      Acoes.tsx
    pages/
      Painel.tsx              # compõe KPIs + Filtros + Tabela
    styles/
      tokens.css              # tokens do design system do CRM
      app.css
  tests/
    mapeamento.test.ts
    kpis.test.ts
  supabase/
    002_marcar_status_e_trigger.sql   # RPC + trigger de derivação (aplicar no banco)
    003_seed_dev.sql                  # seed sintético (dev/preview) — removível
```

---

## Task 0: Scaffold do projeto + git

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Inicializar projeto e git**

Run:
```bash
cd "C:/Users/elite/Documents/MentoriaCRM"
git init
npm create vite@latest . -- --template react-ts   # se recusar por pasta não-vazia, criar arquivos manualmente (abaixo)
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 3: `.gitignore`**

```
node_modules
dist
.env.local
.env
*.local
```

- [ ] **Step 4: `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5: `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite react ts + supabase deps"
```

---

## Task 1: Design tokens + estilos base

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`

- [ ] **Step 1: `src/styles/tokens.css`** (tokens do CRM — escuro + dourado)

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
:root{
  color-scheme:dark;
  --bg:#0A0A0A;--bg1:#111110;--bg2:#16160F;--line:#2A2920;--line-soft:#1B1A14;
  --tx:#F2EDE3;--tx-soft:#B8B0A0;--mut:#6F6960;
  --gold:#CC9346;--gold-l:#E6C88C;--gold12:rgba(204,147,70,.12);
  --pos:#7ECB57;--blue:#6FB4FF;--neg:#F26B4D;
  --fd:"Bricolage Grotesque",system-ui,sans-serif;--fs:"Inter",system-ui,sans-serif;--fm:"JetBrains Mono",ui-monospace,monospace;
}
*{box-sizing:border-box;}
body{margin:0;font-family:var(--fs);color:var(--tx);background:var(--bg);-webkit-font-smoothing:antialiased;
  background-image:linear-gradient(to bottom,var(--gold12),transparent 220px);}
```

- [ ] **Step 2: `src/styles/app.css`** — portar as classes do protótipo `EliteCRM/painel-agendamentos.html` (`.wrap .kpis .kpi .bar .chipbtn table th td .score .st .tick .form-a .acts .act`). Copiar 1:1 do protótipo (linhas 15–47) trocando nada dos tokens.

- [ ] **Step 3: Commit** `git commit -am "style: design tokens e css base do painel"`

---

## Task 2: Supabase client + tipos

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/types.ts`

- [ ] **Step 1: `src/lib/types.ts`**

```ts
export type Status = 'agendado' | 'realizado' | 'no_show' | 'remarcar' | 'nao_agendada';

export interface Agendamento {
  id: string;
  id_contato: string;
  data_reativacao: string | null;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  agendado_em: string | null;
  data_agendada: string | null;
  status: Status;
  status_origem: string | null;
  data_venda: string | null;
  closer: string | null;
  tipo_call: string | null;
  qualificacao: string | null;
  lead_score: number | null;
  form_url: string | null;
  utm_source: string | null;
  utm_content: string | null;
  instagram: string | null;
  id_hubspot: string | null;
  token: string | null;
  confirmacao_enviada: boolean;
  lembrete_enviado: boolean;
  lembrete_agendar_enviado: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local');
}

export const supabase = createClient(url, anon, {
  db: { schema: 'agenda' },
  auth: { persistSession: true, autoRefreshToken: true },
});
```

- [ ] **Step 3: Commit** `git commit -am "feat: supabase client (schema agenda) e tipos"`

---

## Task 3: `mapeamento.ts` (de-para status, faixa score, produto, formatação) — TDD

**Files:**
- Create: `src/lib/mapeamento.ts`, `tests/mapeamento.test.ts`

- [ ] **Step 1: Escrever o teste que falha — `tests/mapeamento.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { statusFromOrigem, faixaScore, PRODUTO_PADRAO, STATUS_LABEL } from '../src/lib/mapeamento';

describe('statusFromOrigem', () => {
  it('mapeia agendadas', () => {
    expect(statusFromOrigem('Call agendada')).toBe('agendado');
    expect(statusFromOrigem('Call confirmada')).toBe('agendado');
  });
  it('mapeia realizadas e vendas', () => {
    expect(statusFromOrigem('Call realizada')).toBe('realizado');
    expect(statusFromOrigem('Venda realizada')).toBe('realizado');
  });
  it('mapeia no-show e remarcar', () => {
    expect(statusFromOrigem('No-show')).toBe('no_show');
    expect(statusFromOrigem('Call reagendada')).toBe('remarcar');
    expect(statusFromOrigem('Call cancelada')).toBe('remarcar');
  });
  it('default e vazio', () => {
    expect(statusFromOrigem('Não agendada')).toBe('nao_agendada');
    expect(statusFromOrigem('')).toBe('nao_agendada');
    expect(statusFromOrigem(null)).toBe('nao_agendada');
    expect(statusFromOrigem('coisa nova')).toBe('nao_agendada');
  });
});

describe('faixaScore', () => {
  it('cortes 8 e 5', () => {
    expect(faixaScore(11)).toBe('alto');
    expect(faixaScore(8)).toBe('alto');
    expect(faixaScore(7)).toBe('medio');
    expect(faixaScore(5)).toBe('medio');
    expect(faixaScore(4)).toBe('baixo');
    expect(faixaScore(-99)).toBe('baixo');
    expect(faixaScore(null)).toBe('baixo');
  });
});

describe('constantes', () => {
  it('produto padrão e labels', () => {
    expect(PRODUTO_PADRAO).toBe('Mentoria');
    expect(STATUS_LABEL.no_show).toBe('No-show');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run tests/mapeamento.test.ts` → FAIL (módulo não existe)

- [ ] **Step 3: Implementar `src/lib/mapeamento.ts`**

```ts
import type { Status } from './types';

export const PRODUTO_PADRAO = 'Mentoria';

const DE_PARA_STATUS: Record<string, Status> = {
  'call agendada': 'agendado',
  'call confirmada': 'agendado',
  'call realizada': 'realizado',
  'venda realizada': 'realizado',
  'no-show': 'no_show',
  'call reagendada': 'remarcar',
  'call cancelada': 'remarcar',
  'não agendada': 'nao_agendada',
};

export function statusFromOrigem(origem: string | null | undefined): Status {
  if (!origem) return 'nao_agendada';
  return DE_PARA_STATUS[origem.trim().toLowerCase()] ?? 'nao_agendada';
}

export const STATUS_LABEL: Record<Status, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  no_show: 'No-show',
  remarcar: 'Remarcar',
  nao_agendada: 'Não agendada',
};

export type Faixa = 'alto' | 'medio' | 'baixo';
export function faixaScore(score: number | null): Faixa {
  if (score === null || Number.isNaN(score)) return 'baixo';
  if (score >= 8) return 'alto';
  if (score >= 5) return 'medio';
  return 'baixo';
}

export function formatDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d
    .toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    .replace(',', '');
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run tests/mapeamento.test.ts` → PASS
- [ ] **Step 5: Commit** `git commit -am "feat: mapeamento (de-para status, faixa score, formatação) + testes"`

---

## Task 4: `kpis.ts` — TDD

**Files:**
- Create: `src/lib/kpis.ts`, `tests/kpis.test.ts`

- [ ] **Step 1: Teste que falha — `tests/kpis.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { calcularKpis } from '../src/lib/kpis';
import type { Agendamento } from '../src/lib/types';

function ag(status: Agendamento['status']): Agendamento {
  return { id: crypto.randomUUID(), id_contato: 'x', data_reativacao: null, nome: null, telefone: null,
    email: null, agendado_em: null, data_agendada: '2026-07-07T14:00:00-03:00', status, status_origem: null,
    data_venda: null, closer: null, tipo_call: null, qualificacao: null, lead_score: null, form_url: null,
    utm_source: null, utm_content: null, instagram: null, id_hubspot: null, token: null,
    confirmacao_enviada: false, lembrete_enviado: false, lembrete_agendar_enviado: false,
    created_at: '', updated_at: '' };
}

describe('calcularKpis', () => {
  it('conta e calcula taxa de comparecimento', () => {
    const lista = [ag('agendado'), ag('agendado'), ag('realizado'), ag('no_show'), ag('remarcar')];
    const k = calcularKpis(lista);
    expect(k.agendados).toBe(2);
    expect(k.realizados).toBe(1);
    expect(k.noShow).toBe(1);
    expect(k.taxaComparecimento).toBe(50); // 1 / (1+1)
  });
  it('taxa 0 quando não há finalizados', () => {
    expect(calcularKpis([ag('agendado')]).taxaComparecimento).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run tests/kpis.test.ts` → FAIL

- [ ] **Step 3: Implementar `src/lib/kpis.ts`**

```ts
import type { Agendamento } from './types';

export interface Kpis {
  agendados: number;
  realizados: number;
  noShow: number;
  taxaComparecimento: number; // 0–100
}

export function calcularKpis(lista: Agendamento[]): Kpis {
  const agendados = lista.filter((a) => a.status === 'agendado').length;
  const realizados = lista.filter((a) => a.status === 'realizado').length;
  const noShow = lista.filter((a) => a.status === 'no_show').length;
  const finalizados = realizados + noShow;
  const taxaComparecimento = finalizados ? Math.round((100 * realizados) / finalizados) : 0;
  return { agendados, realizados, noShow, taxaComparecimento };
}
```

- [ ] **Step 4: Rodar e ver passar** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat: cálculo de KPIs + testes"`

---

## Task 5: RPC + trigger no banco (aplicar via migration)

**Files:**
- Create: `supabase/002_marcar_status_e_trigger.sql`

**Nota:** aplicar com a ferramenta de migration do Supabase (MCP `apply_migration`) — DDL isolado no schema `agenda`.

- [ ] **Step 1: Escrever `supabase/002_marcar_status_e_trigger.sql`**

```sql
-- Deriva status canônico a partir do status_origem (usado pelo trigger de INSERT).
create or replace function agenda.status_from_origem(p text)
returns text language sql immutable as $$
  select case lower(coalesce(trim(p), ''))
    when 'call agendada'   then 'agendado'
    when 'call confirmada' then 'agendado'
    when 'call realizada'  then 'realizado'
    when 'venda realizada' then 'realizado'
    when 'no-show'         then 'no_show'
    when 'call reagendada' then 'remarcar'
    when 'call cancelada'  then 'remarcar'
    else 'nao_agendada'
  end
$$;

-- No INSERT (linhas novas vindas do n8n), deriva status do status_origem.
-- Em updates do n8n, o status NÃO é mexido (preserva a marcação manual do closer).
create or replace function agenda.derivar_status()
returns trigger language plpgsql as $$
begin
  if new.status is null or new.status = 'nao_agendada' then
    new.status := agenda.status_from_origem(new.status_origem);
  end if;
  return new;
end $$;

drop trigger if exists trg_derivar_status on agenda.agendamentos;
create trigger trg_derivar_status
  before insert on agenda.agendamentos
  for each row execute function agenda.derivar_status();

-- Ação do closer: muda status e grava log, de forma atômica.
create or replace function agenda.marcar_status(p_id uuid, p_status text, p_usuario text)
returns agenda.agendamentos
language plpgsql security definer set search_path = agenda as $$
declare
  v_anterior text;
  v_row agenda.agendamentos;
begin
  if p_status not in ('agendado','realizado','no_show','remarcar') then
    raise exception 'status invalido: %', p_status;
  end if;
  select status into v_anterior from agenda.agendamentos where id = p_id;
  update agenda.agendamentos set status = p_status where id = p_id returning * into v_row;
  if v_row.id is null then raise exception 'agendamento nao encontrado: %', p_id; end if;
  insert into agenda.agendamento_status_log (agendamento_id, status_anterior, status, por_usuario)
    values (p_id, v_anterior, p_status, p_usuario);
  return v_row;
end $$;

grant execute on function agenda.marcar_status(uuid, text, text) to authenticated;
```

- [ ] **Step 2: Aplicar a migration** (via MCP `apply_migration`, name `marcar_status_e_trigger`, project `gllpdyeavqxcoocjddyt`).
- [ ] **Step 3: Commit** `git add supabase/002_marcar_status_e_trigger.sql && git commit -m "feat(db): rpc marcar_status + trigger de derivação de status"`

---

## Task 6: Camada de dados `agendamentos.ts`

**Files:**
- Create: `src/lib/agendamentos.ts`

- [ ] **Step 1: Implementar `src/lib/agendamentos.ts`**

```ts
import { supabase } from './supabase';
import type { Agendamento, Status } from './types';

/** Painel: só quem tem reunião marcada (data_agendada preenchida), mais próximas primeiro. */
export async function listarAgendamentos(): Promise<Agendamento[]> {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .not('data_agendada', 'is', null)
    .order('data_agendada', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Agendamento[];
}

/** Ação do closer: grava status + log via RPC atômica. */
export async function marcarStatus(id: string, novoStatus: Status, usuario: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_status', {
    p_id: id,
    p_status: novoStatus,
    p_usuario: usuario,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Commit** `git commit -am "feat: camada de dados (listar + marcarStatus via rpc)"`

---

## Task 7: Auth (provider + login + guarda de rota)

**Files:**
- Create: `src/auth/AuthProvider.tsx`, `src/auth/Login.tsx`

- [ ] **Step 1: `src/auth/AuthProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const Ctx = createContext<{ session: Session | null; carregando: boolean }>({ session: null, carregando: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCarregando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ session, carregando }}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 2: `src/auth/Login.tsx`** — formulário email/senha, chama `supabase.auth.signInWithPassword`, mostra erro. Estilo: card centralizado com tokens (`--bg1`, `--gold`).

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro('E-mail ou senha inválidos.');
    setEnviando(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={entrar} className="login-card">
        <h1 style={{ fontFamily: 'var(--fd)' }}>Painel de Agendamentos</h1>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <p style={{ color: 'var(--neg)' }}>{erro}</p>}
        <button disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
```

(Adicionar `.login-card` e inputs em `app.css` usando tokens.)

- [ ] **Step 3: Commit** `git commit -am "feat: auth provider + tela de login"`

---

## Task 8: Componentes atômicos — `ScoreBadge`, `StatusChip`

**Files:**
- Create: `src/components/ScoreBadge.tsx`, `src/components/StatusChip.tsx`

- [ ] **Step 1: `src/components/ScoreBadge.tsx`**

```tsx
import { faixaScore } from '../lib/mapeamento';

const COR = {
  alto:  { color: '#0A0A0A', background: '#7ECB57' },
  medio: { color: '#0A0A0A', background: '#E6C88C' },
  baixo: { color: '#B8B0A0', background: 'rgba(111,105,96,.25)' },
} as const;

export function ScoreBadge({ score }: { score: number | null }) {
  const s = COR[faixaScore(score)];
  return <span className="score" style={s}>{score ?? '—'}</span>;
}
```

- [ ] **Step 2: `src/components/StatusChip.tsx`**

```tsx
import type { Status } from '../lib/types';
import { STATUS_LABEL } from '../lib/mapeamento';

const CLS: Record<Status, string> = {
  agendado: 'agendado', realizado: 'realizado', no_show: 'noshow',
  remarcar: 'remarcar', nao_agendada: 'remarcar',
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`st ${CLS[status]}`}>{STATUS_LABEL[status]}</span>;
}
```

- [ ] **Step 3: Commit** `git commit -am "feat: ScoreBadge e StatusChip"`

---

## Task 9: KPIs e Filtros (componentes)

**Files:**
- Create: `src/components/Kpis.tsx`, `src/components/Filtros.tsx`

- [ ] **Step 1: `src/components/Kpis.tsx`**

```tsx
import type { Kpis as KpisT } from '../lib/kpis';

export function Kpis({ k }: { k: KpisT }) {
  const cards = [
    { l: 'Agendados', v: k.agendados, a: '#6FB4FF' },
    { l: 'Realizados', v: k.realizados, a: '#7ECB57' },
    { l: 'No-show', v: k.noShow, a: '#F26B4D' },
    { l: 'Comparecimento', v: `${k.taxaComparecimento}%`, a: '#CC9346' },
  ];
  return (
    <div className="kpis">
      {cards.map((c) => (
        <div key={c.l} className="kpi" style={{ ['--accent' as any]: c.a }}>
          <div className="l">{c.l}</div>
          <div className="v">{c.v}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/Filtros.tsx`**

```tsx
import type { Status } from '../lib/types';

export type FiltroStatus = 'todos' | Exclude<Status, 'nao_agendada'>;
const OPCOES: [FiltroStatus, string][] = [
  ['todos', 'Todos'], ['agendado', 'Agendados'], ['realizado', 'Realizados'],
  ['no_show', 'No-show'], ['remarcar', 'Remarcar'],
];

export function Filtros({ valor, onChange }: { valor: FiltroStatus; onChange: (f: FiltroStatus) => void }) {
  return (
    <div className="bar">
      <span className="f">Status</span>
      {OPCOES.map(([v, label]) => (
        <button key={v} className={`chipbtn ${valor === v ? 'on' : ''}`} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit** `git commit -am "feat: Kpis e Filtros"`

---

## Task 10: Tabela + Linha + Ações

**Files:**
- Create: `src/components/TabelaAgendamentos.tsx`, `src/components/LinhaAgendamento.tsx`, `src/components/Acoes.tsx`

- [ ] **Step 1: `src/components/Acoes.tsx`**

```tsx
import type { Status } from '../lib/types';

export function Acoes({ onMarcar, ocupado }: { onMarcar: (s: Status) => void; ocupado: boolean }) {
  return (
    <div className="acts">
      <button className="act" disabled={ocupado} onClick={() => onMarcar('realizado')}>Realizou</button>
      <button className="act" disabled={ocupado} onClick={() => onMarcar('no_show')}>No-show</button>
      <button className="act" disabled={ocupado} onClick={() => onMarcar('remarcar')}>Remarcar</button>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/LinhaAgendamento.tsx`**

```tsx
import type { Agendamento, Status } from '../lib/types';
import { PRODUTO_PADRAO, formatDataHora } from '../lib/mapeamento';
import { ScoreBadge } from './ScoreBadge';
import { StatusChip } from './StatusChip';
import { Acoes } from './Acoes';

export function LinhaAgendamento({ a, onMarcar, ocupado }: {
  a: Agendamento; onMarcar: (id: string, s: Status) => void; ocupado: boolean;
}) {
  return (
    <tr>
      <td><div className="nome">{a.nome ?? '—'}</div><div className="meta">{PRODUTO_PADRAO}</div></td>
      <td className="meta">{formatDataHora(a.data_agendada)}</td>
      <td><ScoreBadge score={a.lead_score} /></td>
      <td><StatusChip status={a.status} /></td>
      <td><span className={`tick ${a.confirmacao_enviada ? 'y' : 'n'}`}>{a.confirmacao_enviada ? '✓' : '–'}</span></td>
      <td><span className={`tick ${a.lembrete_enviado ? 'y' : 'n'}`}>{a.lembrete_enviado ? '✓' : '–'}</span></td>
      <td className="meta">{a.closer ?? '—'}</td>
      <td>{a.form_url ? <a className="form-a" href={a.form_url} target="_blank" rel="noreferrer">ver form ↗</a> : '—'}</td>
      <td><Acoes ocupado={ocupado} onMarcar={(s) => onMarcar(a.id, s)} /></td>
    </tr>
  );
}
```

- [ ] **Step 3: `src/components/TabelaAgendamentos.tsx`**

```tsx
import type { Agendamento, Status } from '../lib/types';
import { LinhaAgendamento } from './LinhaAgendamento';

export function TabelaAgendamentos({ itens, onMarcar, ocupadoId }: {
  itens: Agendamento[]; onMarcar: (id: string, s: Status) => void; ocupadoId: string | null;
}) {
  return (
    <table>
      <thead><tr>
        <th>Cliente</th><th>Reunião</th><th>Score</th><th>Status</th>
        <th>Confirm.</th><th>Lembrete</th><th>Closer</th><th>Form</th><th>Ações</th>
      </tr></thead>
      <tbody>
        {itens.map((a) => (
          <LinhaAgendamento key={a.id} a={a} onMarcar={onMarcar} ocupado={ocupadoId === a.id} />
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Commit** `git commit -am "feat: tabela, linha e ações"`

---

## Task 11: Página Painel (compõe tudo, estado, otimista)

**Files:**
- Create: `src/pages/Painel.tsx`

- [ ] **Step 1: `src/pages/Painel.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Agendamento, Status } from '../lib/types';
import { listarAgendamentos, marcarStatus } from '../lib/agendamentos';
import { calcularKpis } from '../lib/kpis';
import { Kpis } from '../components/Kpis';
import { Filtros, type FiltroStatus } from '../components/Filtros';
import { TabelaAgendamentos } from '../components/TabelaAgendamentos';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';

export function Painel() {
  const { session } = useAuth();
  const [itens, setItens] = useState<Agendamento[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  useEffect(() => {
    listarAgendamentos().then(setItens).catch((e) => setErro(String(e))).finally(() => setCarregando(false));
  }, []);

  async function onMarcar(id: string, novo: Status) {
    setOcupadoId(id);
    const anterior = itens;
    setItens((xs) => xs.map((a) => (a.id === id ? { ...a, status: novo } : a))); // otimista
    try {
      await marcarStatus(id, novo, session?.user.email ?? 'desconhecido');
    } catch (e) {
      setItens(anterior); // rollback
      setErro('Não consegui gravar. Tente de novo.');
    } finally {
      setOcupadoId(null);
    }
  }

  const visiveis = useMemo(
    () => (filtro === 'todos' ? itens : itens.filter((a) => a.status === filtro)),
    [itens, filtro],
  );
  const kpis = useMemo(() => calcularKpis(itens), [itens]);

  return (
    <div className="wrap">
      <div className="eyebrow">Mentoria · Agendamentos</div>
      <h1>Painel de Agendamentos</h1>
      <button className="act" style={{ float: 'right' }} onClick={() => supabase.auth.signOut()}>Sair</button>
      <Kpis k={kpis} />
      <Filtros valor={filtro} onChange={setFiltro} />
      {carregando ? <p>Carregando…</p> : erro ? <p style={{ color: 'var(--neg)' }}>{erro}</p> :
        <TabelaAgendamentos itens={visiveis} onMarcar={onMarcar} ocupadoId={ocupadoId} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit** `git commit -am "feat: página Painel com estado, filtro e ação otimista"`

---

## Task 12: App shell + entrada

**Files:**
- Create: `src/App.tsx`, `src/main.tsx`, `index.html`

- [ ] **Step 1: `src/App.tsx`**

```tsx
import { useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { Painel } from './pages/Painel';

export function App() {
  const { session, carregando } = useAuth();
  if (carregando) return null;
  return session ? <Painel /> : <Login />;
}
```

- [ ] **Step 2: `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: `index.html`** com `<div id="root"></div>` e `<script type="module" src="/src/main.tsx">`.
- [ ] **Step 4: Commit** `git commit -am "feat: app shell (login vs painel)"`

---

## Task 13: Seed sintético de dev + rodar/validar

**Files:**
- Create: `supabase/003_seed_dev.sql`

- [ ] **Step 1: `supabase/003_seed_dev.sql`** — ~15 linhas fake, nomes claramente fictícios, `data_agendada` variada, mix de `status_origem` (deixando o trigger derivar o status), alguns com `confirmacao_enviada`/`lembrete_enviado`, scores variados (−99, 5, 8, 11). Prefixar nomes com "DEV —".

```sql
insert into agenda.agendamentos (id_contato, nome, email, data_agendada, status_origem, closer, lead_score, confirmacao_enviada, lembrete_enviado, form_url) values
('dev-001','DEV — Ana Teste','ana@ex.com', now() + interval '1 day',  'Call agendada','gleibson fernandes', 11, true,  false, 'https://exemplo/form/1'),
('dev-002','DEV — Bruno Teste','bruno@ex.com', now() + interval '2 hours','Call confirmada','Fernando Gomes',    8, true,  true,  'https://exemplo/form/2'),
('dev-003','DEV — Carla Teste','carla@ex.com', now() - interval '1 day',  'No-show','gleibson fernandes',        6, true,  true,  null),
('dev-004','DEV — Diego Teste','diego@ex.com', now() - interval '2 day',  'Venda realizada','Andrade',           9, true,  true,  'https://exemplo/form/4'),
('dev-005','DEV — Eva Teste','eva@ex.com',     now() + interval '3 day',  'Call reagendada','Lucas Carneiro',    4, false, false, null),
('dev-006','DEV — Fábio Teste','fabio@ex.com', now() + interval '5 hours','Call agendada','Fernando Gomes',      -99,false, false, 'https://exemplo/form/6')
on conflict (id_contato) do nothing;
```
(Repetir/variar até ~15 linhas.)

- [ ] **Step 2: Aplicar seed** (MCP `apply_migration` name `seed_dev`).
- [ ] **Step 3: Configurar `.env.local`** com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (pegar via MCP `get_project_url` / `get_publishable_keys`).
- [ ] **Step 4: Expor schema** — no painel Supabase: **Settings → API → Exposed schemas** → adicionar `agenda`. (Sem isso o `supabase-js` não enxerga a tabela.)
- [ ] **Step 5: Criar o usuário único** (via Supabase Auth — dashboard ou MCP), guardar credenciais.
- [ ] **Step 6: Rodar** `npm run dev`, logar, validar: KPIs corretos, filtro, marcar Realizado/No-show/Remarcar (ver chip mudar + conferir linha em `agenda.agendamento_status_log`).
- [ ] **Step 7: Commit** `git commit -am "chore: seed de dev + validação local"`

---

## Task 14: Docs de deploy + handoff do n8n

**Files:**
- Create: `README.md`, `docs/n8n-handoff.md`, `.env.example`

- [ ] **Step 1: `.env.example`** com as duas chaves (sem valores reais).
- [ ] **Step 2: `README.md`** — como rodar local, variáveis, e passos de deploy na Vercel (import do repo, env vars, build `vite build`, output `dist`). Registrar o toggle **Exposed schemas = agenda**.
- [ ] **Step 3: `docs/n8n-handoff.md`** — contrato de ingestão pro n8n:
  - Destino: `agenda.agendamentos`, **upsert por `id_contato`** (`on conflict (id_contato) do update`).
  - No `do update`: atualizar `status_origem`, `data_agendada`, `agendado_em`, `data_venda`, `closer`, `confirmacao_enviada`, `lembrete_enviado`, dados de contato/utm/score — **mas NÃO** a coluna `status` (preserva a marcação manual do closer).
  - `status_origem` = valor cru da coluna Status da planilha; o trigger deriva `status` só no INSERT.
  - Booleanos: `sim` → true.
  - Datas: enviar como timestamptz (ou texto `dd/MM/yyyy HH:mm` convertido no nó).
- [ ] **Step 4: Antes do go-live:** `truncate agenda.agendamentos restart identity cascade;` para remover o seed de dev.
- [ ] **Step 5: Commit** `git commit -am "docs: readme, deploy e handoff do n8n"`

---

## Self-review (cobertura do spec)

- ✅ Login email/senha (Task 7)
- ✅ Tela única: KPIs + filtro + tabela (Tasks 9–12)
- ✅ Colunas exatas + ações (Task 10)
- ✅ Ação grava status + log append-only (Task 5 RPC + Task 11)
- ✅ Fonte Supabase, schema `agenda`, sem import histórico (Tasks 2/6/13)
- ✅ Design tokens do CRM (Task 1)
- ✅ Lead score por faixa nova + status de-para (Task 3)
- ✅ Deploy + usuário + handoff n8n (Task 14)
- ✅ v2 fora do escopo (não há tarefa) — Calendly deep-sync, lembretes automáticos, multi-closer/RLS por closer, relatórios.

## Riscos / pontos de atenção
1. **Exposed schemas**: sem adicionar `agenda` na API, o app não lê nada (Task 13.4).
2. **Duas fontes de verdade para `status`**: contrato do n8n resolve (não sobrescrever `status` no upsert). Documentado no handoff.
3. **Seed de dev**: lembrar do `truncate` antes do go-live (Task 14.4).
