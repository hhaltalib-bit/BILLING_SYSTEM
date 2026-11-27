// Category icons. Default categories store a key ('food', 'car', …);
// custom categories store the emoji the user picked.

const DEFAULT_ICON_EMOJI: Record<string, string> = {
  food: '🍔', elec: '💡', car: '🚗', home: '🏠', book: '📚', exam: '📝',
  game: '🎮', wrench: '🔧', heart: '💊', shirt: '👕', other: '📦', tag: '🏷️',
}

/** Emojis offered when creating a custom category. */
export const CATEGORY_EMOJI_CHOICES = [
  '📦', '🍔', '🚗', '🛍️', '💊', '🎮', '📚', '💡', '✈️', '👗',
  '💇', '🏠', '🐾', '📱', '⚽', '🎵', '☕', '🧴', '🎁', '💰',
] as const

export function categoryEmoji(icon: string | null | undefined): string {
  if (!icon) return '📦'
  return DEFAULT_ICON_EMOJI[icon] ?? icon
}
