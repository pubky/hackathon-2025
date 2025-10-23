import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { TagColor } from '../types';

interface TagSelectorProps {
  onAddTag: (tagText: string, tagColor: TagColor) => Promise<void>;
  currentTagCount: number;
  maxTags?: number;
}

const TAG_COLOR_SEQUENCE: TagColor[] = ['lime', 'amber', 'violet'];

const SUGGESTED_TAGS = [
  'mediocre',
  'meh',
  'ok',
  'decent',
  'recommended'
];

export function TagSelector({ onAddTag, currentTagCount, maxTags = 3 }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tagText, setTagText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMoreTags = currentTagCount < maxTags;

  const handleAddTag = async () => {
    if (!tagText.trim()) {
      setError('Please enter tag text');
      return;
    }

    if (tagText.length > 30) {
      setError('Tag text must be 30 characters or less');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const autoColor = TAG_COLOR_SEQUENCE[currentTagCount % TAG_COLOR_SEQUENCE.length];
      await onAddTag(tagText.trim(), autoColor);
      setTagText('');
      setIsOpen(false);
    } catch (err) {
      console.error('[TagSelector] Error adding tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSuggestedTag = (suggestion: string) => {
    setTagText(suggestion);
  };

  if (!canAddMoreTags) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-full text-[10px] font-bold transition-all border border-warm-300 hover:border-warm-400"
      >
        <Plus className="w-3 h-3" />
        <span>Add Tag</span>
        <span className="text-[9px] opacity-75">({currentTagCount}/{maxTags})</span>
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-warm-300 rounded-xl p-3 space-y-3 shadow-soft-md animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Tag className="w-4 h-4 text-warm-700" />
          <h3 className="text-xs font-bold text-warm-900">Add Tag</h3>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setTagText('');
            setError(null);
          }}
          className="text-warm-500 hover:text-warm-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-warm-700 mb-1.5">Tag Text</label>
        <input
          type="text"
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAdding) {
              handleAddTag();
            }
          }}
          placeholder="Enter tag text"
          maxLength={30}
          className="w-full px-2.5 py-1.5 text-[10px] border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent"
        />
        <p className="text-[9px] text-warm-600 mt-1">
          {tagText.length}/30 characters
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-warm-700 mb-1.5">Suggestions</label>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_TAGS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestedTag(suggestion)}
              className="px-2 py-1 text-[9px] bg-warm-50 hover:bg-warm-100 text-warm-700 rounded-full border border-warm-200 hover:border-warm-300 transition-all font-medium"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-[10px] text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleAddTag}
        disabled={isAdding || !tagText.trim()}
        className="w-full px-3 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
      >
        {isAdding ? (
          <>
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Adding...</span>
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            <span>Add Tag</span>
          </>
        )}
      </button>
    </div>
  );
}
