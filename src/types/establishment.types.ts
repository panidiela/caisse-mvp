export type Zone = {
  id: string;
  name: string;
  isActive: boolean;
};

export type Table = {
  id: string;
  name: string;
  zoneId?: string | null; // 🔥 OPTIONNEL
  isActive: boolean;
  status: 'free' | 'occupied' | 'attention';
};