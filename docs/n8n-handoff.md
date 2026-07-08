# Ingestão do n8n → `agenda.agendamentos`

Contrato para o fluxo do n8n que alimenta o painel. Destino: **`agenda.agendamentos`**, **upsert por `id_contato`** (`on conflict (id_contato) do update`).

## Regras de ouro
1. **Não escreva na coluna `status`.** Escreva o valor cru da planilha em **`status_origem`** — um trigger converte para o `status` canônico automaticamente.
2. **No `do update`, não inclua `status`** — assim a marcação manual do closer (feita no app) não é sobrescrita quando o n8n reprocessa. (O trigger só re-deriva o status enquanto o closer não tiver marcado manualmente.)
3. **Datas em ISO com fuso.** Nunca mande `dd/MM/yyyy` cru (o Postgres lê como MM/DD). Converta no n8n:
   - de texto BR: `{{ DateTime.fromFormat(valor, 'dd/MM/yyyy HH:mm', { zone: 'America/Sao_Paulo' }).toISO() }}`
   - de Unix ms: `{{ DateTime.fromMillis(valor).toISO() }}`
4. **Booleanos:** `sim` → `true`; qualquer outra coisa → `false` (`confirmacao_enviada`, `lembrete_enviado`, `lembrete_agendar_enviado`).

## Mapa de colunas (planilha → tabela)
| Coluna da tabela | Origem na planilha |
|---|---|
| `id_contato` *(chave do upsert)* | Id do contato |
| `status_origem` | **Status** (texto cru) |
| `nome` `telefone` `email` `instagram` | idem |
| `data_reativacao` `agendado_em` `data_agendada` `data_venda` | as datas (ISO, ver regra 3) |
| `closer` `tipo_call` `qualificacao` `lead_score` | idem |
| `form_url` | Link Resposta Typeform |
| `link_call` | link da reunião (Meet/Zoom), quando houver |
| `utm_source` `utm_content` | idem |
| `confirmacao_enviada` `lembrete_enviado` | `sim` → true |

## De-para de status (feito pelo trigger, não pelo n8n)
| `status_origem` | `status` |
|---|---|
| Call agendada · Call confirmada | agendado |
| Call realizada · Venda realizada | realizado |
| No-show | no_show |
| Call reagendada | remarcar |
| Call cancelada | cancelado |
| Não agendada · (vazio) | nao_agendada (fora do painel) |

Se a operação criar um rótulo novo de Status, basta acrescentar 1 linha na função `agenda.status_from_origem` — o n8n não precisa saber das regras.
