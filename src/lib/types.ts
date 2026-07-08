export type Status =
  | 'agendado'
  | 'realizado'
  | 'no_show'
  | 'remarcar'
  | 'cancelado'
  | 'nao_agendada';

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
  link_call: string | null;
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
