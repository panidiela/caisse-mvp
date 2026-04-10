// src/utils/format.ts

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Espèces';
    case 'orange_money': return 'Orange Money';
    case 'mtn_money': return 'MTN Mobile Money';
    default: return method;
  }
}
