import { X } from 'lucide-react';
import { SessionTag, TagColor } from '../types';

interface TagDisplayProps {
  tags: SessionTag[];
  onRemoveTag?: (tagId: string) => void;
  canEdit?: boolean;
  size?: 'sm' | 'md';
}

const TAG_COLORS: Record<TagColor, { bg: string; text: string; border: string; hover: string }> = {
  coral: {
    bg: 'bg-coral-100',
    text: 'text-coral-800',
    border: 'border-coral-300',
    hover: 'hover:bg-coral-200'
  },
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    hover: 'hover:bg-emerald-200'
  },
  sky: {
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-300',
    hover: 'hover:bg-sky-200'
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    hover: 'hover:bg-amber-200'
  },
  rose: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    hover: 'hover:bg-rose-200'
  },
  violet: {
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    border: 'border-violet-300',
    hover: 'hover:bg-violet-200'
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    hover: 'hover:bg-cyan-200'
  },
  lime: {
    bg: 'bg-lime-100',
    text: 'text-lime-800',
    border: 'border-lime-300',
    hover: 'hover:bg-lime-200'
  }
};

export function TagDisplay({ tags, onRemoveTag, canEdit = false, size = 'md' }: TagDisplayProps) {
  if (tags.length === 0) {
    return null;
  }

  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-2 py-0.5 gap-1'
    : 'text-[10px] px-2.5 py-1 gap-1.5';

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const colors = TAG_COLORS[tag.tag_color];
        return (
          <div
            key={tag.id}
            className={`inline-flex items-center ${sizeClasses} rounded-full border font-bold transition-all ${colors.bg} ${colors.text} ${colors.border} ${canEdit ? colors.hover : ''} animate-fade-in`}
          >
            <span>{tag.tag_text}</span>
            {canEdit && onRemoveTag && (
              <button
                onClick={() => onRemoveTag(tag.id)}
                className={`ml-0.5 ${colors.text} opacity-70 hover:opacity-100 transition-opacity`}
                aria-label="Remove tag"
              >
                <X className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
