import { FormEvent, KeyboardEvent, useState } from 'react';
import { getTagTone } from '../utils/tagTone';
import './TagInput.css';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export const TagInput = ({ value, onChange, ariaLabel, disabled = false }: Props) => {
  const [draft, setDraft] = useState('');

  const addTag = (tag: string) => {
    if (disabled) return;
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) {
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    if (disabled) return;
    onChange(value.filter((item) => item !== tag));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    addTag(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && !draft) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={`tag-input${disabled ? ' tag-input--disabled' : ''}`}>
      <div className="tag-input__header">
        <h4>Tags</h4>
        <p>Label projects with themes to make browsing easier.</p>
      </div>
      <div className="tag-input__chips">
        {value.map((tag) => (
          <span key={tag} className={`chip ${getTagTone(tag)}`}>
            <span aria-hidden="true" className="chip__hash">
              #
            </span>
            <span className="chip__label">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form className="tag-input__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag"
          aria-label={ariaLabel}
          disabled={disabled}
        />
        <button className="button" type="submit" disabled={disabled}>
          Add
        </button>
      </form>
    </div>
  );
};
