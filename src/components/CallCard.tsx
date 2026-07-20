import { useEffect, useRef, useState } from 'react';
import type { Agendamento, MensagemConversa, Status } from '../lib/types';
import { buscarConversa } from '../lib/agendamentos';
import {
  PRODUTO_PADRAO,
  STATUS_LABEL,
  STATUS_MARCAVEIS,
  faixaScore,
  formatHora,
  abrevDia,
} from '../lib/mapeamento';

const COR_SCORE: Record<string, { color: string; background: string }> = {
  alto: { color: '#141310', background: '#83b76a' },
  medio: { color: '#141310', background: '#e4a93a' },
  baixo: { color: '#a29a8b', background: 'rgba(101,95,85,.22)' },
};

export function CallCard({
  a,
  onMarcar,
  ocupado,
}: {
  a: Agendamento;
  onMarcar: (id: string, s: Status) => void;
  ocupado: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [conversa, setConversa] = useState<MensagemConversa[] | null>(null);
  const [carregandoConv, setCarregandoConv] = useState(false);
  const [erroConv, setErroConv] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const sc = COR_SCORE[faixaScore(a.lead_score)];

  // Busca a conversa só quando expande, e uma vez só (fica em cache no card).
  useEffect(() => {
    if (!aberto || conversa !== null || carregandoConv || erroConv) return;
    setCarregandoConv(true);
    buscarConversa(a.id)
      .then(setConversa)
      .catch(() => setErroConv(true))
      .finally(() => setCarregandoConv(false));
  }, [aberto, a.id, conversa, carregandoConv, erroConv]);

  // Abre já na mensagem mais recente.
  useEffect(() => {
    if (conversa && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [conversa]);

  function copiar() {
    if (!a.link_call) return;
    navigator.clipboard?.writeText(a.link_call).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1200);
  }

  const agente = conversa?.find((m) => m.agente)?.agente ?? null;

  return (
    <div className="call">
      <div className="callmain">
        <div className="time">
          <div className="h">{formatHora(a.data_agendada)}</div>
          <div className="d">{abrevDia(a.data_agendada)}</div>
        </div>
        <div className="info">
          <div className="top">
            <span className="nome">{a.nome ?? 'Sem nome'}</span>
            <span className="score" style={sc}>
              {a.lead_score ?? '—'}
            </span>
            <span className={`st ${a.status}`}>{STATUS_LABEL[a.status]}</span>
          </div>
          <div className="bot">
            <span>{PRODUTO_PADRAO}</span>·
            <span>{a.qualificacao ?? 'sem qualificação'}</span>·
            <span>{a.closer ?? 'sem closer'}</span>
          </div>
        </div>
        <div className="right">
          {a.link_call ? (
            <>
              <a
                className="join"
                href={a.link_call}
                target="_blank"
                rel="noreferrer"
              >
                <i className="ti ti-video" aria-hidden="true"></i>Entrar
              </a>
              <button
                className="iconbtn"
                onClick={copiar}
                aria-label="Copiar link da call"
              >
                <i className={copiado ? 'ti ti-check' : 'ti ti-copy'}></i>
              </button>
            </>
          ) : (
            <span className="nolink">sem link</span>
          )}
          <select
            className="marksel-row"
            value={a.status === 'nao_agendada' ? 'agendado' : a.status}
            disabled={ocupado}
            onChange={(e) => onMarcar(a.id, e.target.value as Status)}
            aria-label="Marcar status"
          >
            {STATUS_MARCAVEIS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            className="iconbtn"
            onClick={() => setAberto((v) => !v)}
            aria-label="Detalhes"
          >
            <i
              className="ti ti-chevron-down"
              style={{ transform: aberto ? 'rotate(180deg)' : '' }}
            ></i>
          </button>
        </div>
      </div>

      {aberto && (
        <div className="detalhe">
          <div className="col-conversa">
            <div className="secttl">
              <i className="ti ti-message-circle"></i>
              Conversa{agente ? ` · ${agente}` : ''}
              {conversa && conversa.length > 0 && (
                <span className="qtd">{conversa.length} msgs</span>
              )}
            </div>
            <div className="chat" ref={chatRef}>
              {carregandoConv ? (
                <div className="chat-vazio">Carregando conversa…</div>
              ) : erroConv ? (
                <div className="chat-vazio">Não consegui carregar a conversa.</div>
              ) : !conversa || conversa.length === 0 ? (
                <div className="chat-vazio">Sem conversa registrada.</div>
              ) : (
                conversa.map((m, i) => (
                  <div
                    key={i}
                    className={`m ${m.autor === 'human' ? 'lead' : 'ag'}`}
                  >
                    {m.conteudo}
                    <div className="hr">{formatHora(m.em)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-dados">
            <div className="secttl">
              <i className="ti ti-user"></i>Dados do lead
            </div>
            <div className="bloco">
              <div className="dl">Telefone</div>
              <div className="dv">{a.telefone ?? '—'}</div>
              <div className="dl">Email</div>
              <div className="dv">{a.email ?? '—'}</div>
              <div className="dl">Instagram</div>
              <div className="dv">{a.instagram ?? '—'}</div>
              <div className="dl">Tipo de call</div>
              <div className="dv">{a.tipo_call ?? '—'}</div>
              <div className="dl">Qualificação</div>
              <div className="dv">
                {a.qualificacao ?? '—'}
                {a.lead_score != null ? ` · score ${a.lead_score}` : ''}
              </div>
              <div className="dl">Formulário</div>
              <div className="dv ultimo">
                {a.form_url ? (
                  <a href={a.form_url} target="_blank" rel="noreferrer">
                    ver respostas{' '}
                    <i
                      className="ti ti-external-link"
                      style={{ fontSize: 11 }}
                    ></i>
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>

            {a.respostas && Object.keys(a.respostas).length > 0 && (
              <>
                <div className="secttl espaco">
                  <i className="ti ti-list-check"></i>Respostas do formulário
                </div>
                <div className="bloco">
                  {Object.entries(a.respostas).map(([q, v]) => (
                    <div key={q}>
                      <div className="rq">{q}</div>
                      <div className="ra">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
