import { useMemo } from 'react';
import './ScoreSlider.css';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const buildGradient = (value: number) => {
  const percentage = Math.round((value / 10) * 100);
  return `linear-gradient(90deg, rgba(155, 168, 255, 0.92) ${percentage}%, rgba(47, 52, 80, 0.35) ${percentage}%)`;
};

export const ScoreSlider = ({ label, value, onChange }: Props) => {
  const background = useMemo(() => buildGradient(value), [value]);

  return (
    <label className="slider">
      <span className="slider__label">{label}</span>
      <div className="slider__input">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          style={{ backgroundImage: background }}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={`${value} out of 10`}
        />
        <span className="slider__value">{value}</span>
      </div>
    </label>
  );
};
