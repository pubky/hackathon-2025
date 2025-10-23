import { useMemo } from 'react';
import './ScoreSlider.css';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const buildGradient = (value: number) => {
  const percentage = Math.round((value / 10) * 100);
  return `linear-gradient(90deg, rgba(155, 168, 255, 0.92) ${percentage}%, rgba(47, 52, 80, 0.35) ${percentage}%)`;
};

export const ScoreSlider = ({ label, value, onChange, disabled = false }: Props) => {
  const background = useMemo(() => (disabled ? undefined : buildGradient(value)), [value, disabled]);

  return (
    <label className={`slider${disabled ? ' slider--disabled' : ''}`}>
      <span className="slider__label">{label}</span>
      <div className="slider__input">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          style={background ? { backgroundImage: background } : undefined}
          onChange={(event) => {
            if (disabled) return;
            onChange(Number(event.target.value));
          }}
          disabled={disabled}
          aria-valuetext={`${value} out of 10`}
        />
        <span className="slider__value">{value}</span>
      </div>
    </label>
  );
};
