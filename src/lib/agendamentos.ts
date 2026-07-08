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
export async function marcarStatus(
  id: string,
  novoStatus: Status,
  usuario: string,
): Promise<void> {
  const { error } = await supabase.rpc('marcar_status', {
    p_id: id,
    p_status: novoStatus,
    p_usuario: usuario,
  });
  if (error) throw error;
}
