// ─── Seva Type ───────────────────────────────────────────────────────────────
export type SevaType = 'annadan' | 'yajman';

// ─── Display Labels ───────────────────────────────────────────────────────────
export const SEVA_LABELS: Record<SevaType, { title: string; subtitle: string; icon: string; color: string }> = {
  annadan: {
    title: 'Annadan',
    subtitle: 'Mahaprasad Seva',
    icon: 'rice-bowl',
    color: '#E65C00',
  },
  yajman: {
    title: 'Guruji Aarti Seva',
    subtitle: 'Yajman Booking',
    icon: 'local-fire-department',
    color: '#B97512',
  },
};
