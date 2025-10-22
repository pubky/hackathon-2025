const TONES = ['blue', 'green', 'purple'] as const;

type Tone = (typeof TONES)[number];

export const getTagTone = (tag: string): `tone-${Tone}` => {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) {
    return 'tone-blue';
  }
  const hash = Array.from(normalized).reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
  const tone = TONES[hash % TONES.length];
  return `tone-${tone}`;
};
