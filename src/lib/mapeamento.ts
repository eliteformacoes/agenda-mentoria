import type { Status } from './types';

export const PRODUTO_PADRAO = 'Mentoria';
const TZ = 'America/Sao_Paulo';

const DE_PARA_STATUS: Record<string, Status> = {
  'call agendada': 'agendado',
  'call confirmada': 'agendado',
  'call realizada': 'realizado',
  'venda realizada': 'realizado',
  'no-show': 'no_show',
  'call reagendada': 'remarcar',
  'call cancelada': 'cancelado',
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
  cancelado: 'Cancelado',
  nao_agendada: 'Não agendada',
};

/** Status que o closer pode marcar manualmente no app. */
export const STATUS_MARCAVEIS: Status[] = [
  'agendado',
  'realizado',
  'no_show',
  'remarcar',
  'cancelado',
];

export type Faixa = 'alto' | 'medio' | 'baixo';
export function faixaScore(score: number | null): Faixa {
  if (score === null || Number.isNaN(score)) return 'baixo';
  if (score >= 8) return 'alto';
  if (score >= 5) return 'medio';
  return 'baixo';
}

export type Grupo = 'hoje' | 'amanha' | 'proximos' | 'passado';

function ymd(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ }); // yyyy-mm-dd
}

/** Classifica um agendamento em hoje / amanhã / próximos / passado (fuso BR). */
export function grupoData(iso: string | null, agora: Date = new Date()): Grupo {
  if (!iso) return 'passado';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'passado';
  const hoje = new Date(ymd(agora) + 'T00:00:00');
  const dia = new Date(ymd(d) + 'T00:00:00');
  const diff = Math.round((dia.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return 'passado';
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanha';
  return 'proximos';
}

/** Horário curto: "14:00" (fuso BR). */
export function formatHora(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Abreviação do dia da semana no fuso BR: "Ter". */
export function abrevDia(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const wd = d.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'short' });
  const limpo = wd.replace('.', '').trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/** Rótulo do cabeçalho de dia: "Ter 07/07" (com prefixo Hoje/Amanhã). */
export function formatDiaHeader(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return 'Sem data';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sem data';
  const dm = d.toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
  });
  const base = `${abrevDia(iso)} ${dm}`;
  const g = grupoData(iso, agora);
  if (g === 'hoje') return `Hoje · ${base}`;
  if (g === 'amanha') return `Amanhã · ${base}`;
  return base;
}
