export const DEAL_CATEGORIES = [
  'FOOD',
  'DRINKS',
  'SUBSCRIPTIONS',
  'TRANSPORT',
  'SHOPPING',
  'LIFESTYLE',
] as const;

export type DealCategory = (typeof DEAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DealCategory, string> = {
  FOOD: 'Food',
  DRINKS: 'Drinks',
  SUBSCRIPTIONS: 'Subscriptions',
  TRANSPORT: 'Transport',
  SHOPPING: 'Shopping',
  LIFESTYLE: 'Lifestyle',
};

export const CATEGORY_ICONS: Record<DealCategory, string> = {
  FOOD: '🍔',
  DRINKS: '🥤',
  SUBSCRIPTIONS: '📱',
  TRANSPORT: '🚗',
  SHOPPING: '🛍️',
  LIFESTYLE: '🎮',
};
