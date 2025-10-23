import { FormEvent, KeyboardEvent, useState } from 'react';
import { getTagTone } from '../utils/tagTone';
import './TagInput.css';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  ariaLabel: string;
}

export const TagInput = ({ value, onChange, ariaLabel }: Props) => {
  const [draft, setDraft] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) {
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addTag(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && !draft) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="tag-input">
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
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
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
        />
        <button className="button" type="submit">
          Add
        </button>
      </form>
    </div>
  );
};
