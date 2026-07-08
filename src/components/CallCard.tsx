import { useState } from 'react';
import type { Agendamento, Status } from '../lib/types';
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
  const sc = COR_SCORE[faixaScore(a.lead_score)];

  function copiar() {
    if (!a.link_call) return;
    navigator.clipboard?.writeText(a.link_call).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1200);
  }

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
            <span>{PRODUTO_PADRAO}</span>·<span>{a.qualificacao ?? 'sem qualificação'}</span>·
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
        <div className="detail">
          <div className="grid">
            <div>
              <div className="dl">Telefone</div>
              <div className="dv">{a.telefone ?? '—'}</div>
            </div>
            <div>
              <div className="dl">Email</div>
              <div className="dv">{a.email ?? '—'}</div>
            </div>
            <div>
              <div className="dl">Instagram</div>
              <div className="dv">{a.instagram ?? '—'}</div>
            </div>
            <div>
              <div className="dl">Tipo de call</div>
              <div className="dv">{a.tipo_call ?? '—'}</div>
            </div>
            <div>
              <div className="dl">Qualificação</div>
              <div className="dv">
                {a.qualificacao ?? '—'}
                {a.lead_score != null ? ` · score ${a.lead_score}` : ''}
              </div>
            </div>
            <div>
              <div className="dl">Formulário</div>
              <div className="dv">
                {a.form_url ? (
                  <a href={a.form_url} target="_blank" rel="noreferrer">
                    ver respostas{' '}
                    <i
                      className="ti ti-external-link"
                      style={{ fontSize: 12 }}
                    ></i>
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>
          {a.respostas && Object.keys(a.respostas).length > 0 && (
            <div className="respostas">
              <div className="dl">Respostas do formulário</div>
              {Object.entries(a.respostas).map(([q, v]) => (
                <div className="resp-item" key={q}>
                  <span className="resp-q">{q}</span>
                  <span className="resp-a">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
