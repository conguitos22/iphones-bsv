export function formatBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parcelaBRL(total: number, max: number) {
  if (!max || max <= 1) return null;
  return `${max}x de ${formatBRL(total / max)} sem juros`;
}

export const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pagamento pendente',
  aprovado: 'Pagamento aprovado',
  preparando: 'Preparando pedido',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};
