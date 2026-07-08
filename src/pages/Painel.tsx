import { useEffect, useMemo, useState } from 'react';
import type { Agendamento, Status } from '../lib/types';
import { listarAgendamentos, marcarStatus } from '../lib/agendamentos';
import {
  STATUS_LABEL,
  grupoData,
  formatHora,
  formatDiaHeader,
  type Grupo,
} from '../lib/mapeamento';
import { CallCard } from '../components/CallCard';
import { useAuth } from '../auth';
import { supabase } from '../lib/supabase';

type Aba = Grupo | 'todos';
const ABAS: [Aba, string][] = [
  ['hoje', 'Hoje'],
  ['amanha', 'Amanhã'],
  ['proximos', 'Próximos'],
  ['passado', 'Passados'],
  ['todos', 'Todos'],
];

export function Painel() {
  const { session } = useAuth();
  const [itens, setItens] = useState<Agendamento[]>([]);
  const [aba, setAba] = useState<Aba>('hoje');
  const [statusFiltro, setStatusFiltro] = useState<Status | 'todos'>('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  useEffect(() => {
    listarAgendamentos()
      .then(setItens)
      .catch((e) => setErro(String(e?.message ?? e)))
      .finally(() => setCarregando(false));
  }, []);

  async function onMarcar(id: string, novo: Status) {
    setOcupadoId(id);
    const anterior = itens;
    setItens((xs) => xs.map((a) => (a.id === id ? { ...a, status: novo } : a)));
    try {
      await marcarStatus(id, novo, session?.user.email ?? 'desconhecido');
    } catch {
      setItens(anterior);
      setErro('Não consegui gravar o status. Tente de novo.');
    } finally {
      setOcupadoId(null);
    }
  }

  const contarAba = (a: Aba) =>
    itens.filter(
      (x) =>
        (a === 'todos' || grupoData(x.data_agendada) === a) &&
        (statusFiltro === 'todos' || x.status === statusFiltro),
    ).length;

  const visiveis = useMemo(
    () =>
      itens.filter(
        (x) =>
          (aba === 'todos' || grupoData(x.data_agendada) === aba) &&
          (statusFiltro === 'todos' || x.status === statusFiltro),
      ),
    [itens, aba, statusFiltro],
  );

  const proxima = useMemo(() => {
    const agora = Date.now();
    return itens
      .filter(
        (x) =>
          x.status === 'agendado' &&
          x.data_agendada &&
          new Date(x.data_agendada).getTime() >= agora,
      )
      .sort(
        (a, b) =>
          new Date(a.data_agendada!).getTime() -
          new Date(b.data_agendada!).getTime(),
      )[0];
  }, [itens]);

  const gruposDeDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const it of visiveis) {
      const chave = formatDiaHeader(it.data_agendada);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(it);
    }
    return [...mapa.entries()];
  }, [visiveis]);

  return (
    <div className="wrap pa-frame">
      <div className="topbar">
        <div>
          <h1>Minhas calls</h1>
          <p className="subttl">
            Suas reuniões estratégicas da mentoria — organizadas por horário
          </p>
        </div>
        <button className="signout" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>

      {proxima && (
        <div className="next">
          <div className="ci">
            <i className="ti ti-clock-hour-4"></i>
          </div>
          <div>
            <div className="cd">Próxima call</div>
            <div className="big">
              {formatHora(proxima.data_agendada)} · {proxima.nome ?? 'Sem nome'}
            </div>
            <div className="sm">
              {proxima.closer ?? 'sem closer'}
              {proxima.lead_score != null ? ` · score ${proxima.lead_score}` : ''}
            </div>
          </div>
          {proxima.link_call && (
            <a
              className="btn-gold"
              href={proxima.link_call}
              target="_blank"
              rel="noreferrer"
            >
              <i className="ti ti-video"></i>Entrar na call
            </a>
          )}
        </div>
      )}

      <div className="navrow">
        <div className="tabs">
          {ABAS.map(([k, label]) => (
            <button
              key={k}
              className={`tab ${aba === k ? 'on' : ''}`}
              onClick={() => setAba(k)}
            >
              {label}
              <span className="n">{contarAba(k)}</span>
            </button>
          ))}
        </div>
        <div className="filter">
          <i className="ti ti-filter"></i>
          <select
            className="sel"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as Status | 'todos')
            }
          >
            <option value="todos">Todos os status</option>
            {(['agendado', 'realizado', 'no_show', 'remarcar', 'cancelado'] as Status[]).map(
              (s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {carregando ? (
        <div className="empty">Carregando…</div>
      ) : erro ? (
        <div className="empty" style={{ color: 'var(--neg)' }}>
          {erro}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="empty">Nenhuma call aqui.</div>
      ) : (
        gruposDeDia.map(([dia, lista]) => (
          <div className="daygroup" key={dia}>
            <div className="dayhdr">
              {dia}
              <span className="ln"></span>
            </div>
            {lista.map((a) => (
              <CallCard
                key={a.id}
                a={a}
                onMarcar={onMarcar}
                ocupado={ocupadoId === a.id}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
