import { ChangeEvent } from 'react';
import type { Project, ScoreComponent } from '../types/project';
import { ScoreSlider } from './ScoreSlider';
import { TagInput } from './TagInput';
import './ProjectCard.css';

interface Props {
  project: Project;
  onScoreChange: (projectId: string, component: ScoreComponent, value: number) => void;
  onReadinessToggle: (projectId: string, ready: boolean) => void;
  onCommentChange: (projectId: string, comment: string) => void;
  onTagsChange: (projectId: string, tags: string[]) => void;
}

const SCORE_LABELS: Record<ScoreComponent, string> = {
  complexity: 'Complexity',
  creativity: 'Creativity / Practicality',
  presentation: 'Team Presentation',
  feedback: 'Feedback Quality'
};

export const ProjectCard = ({ project, onScoreChange, onReadinessToggle, onCommentChange, onTagsChange }: Props) => {
  const handleSlider = (component: ScoreComponent) => (value: number) => {
    onScoreChange(project.id, component, value);
  };

  const handleComment = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onCommentChange(project.id, event.target.value);
  };

  const handleReadiness = (event: ChangeEvent<HTMLInputElement>) => {
    onReadinessToggle(project.id, event.target.checked);
  };

  const handleTagsUpdate = (tags: string[]) => {
    onTagsChange(project.id, tags);
  };

  return (
    <article className="project-card" aria-label={`Project ${project.name}`}>
      <header className="project-card__header">
        <div>
          <h3>{project.name}</h3>
          <p className="project-card__description">{project.description}</p>
        </div>
        <div className="project-card__tags">
          {project.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <section className="project-card__scores">
        {Object.entries(SCORE_LABELS).map(([component, label]) => (
          <ScoreSlider
            key={component}
            label={label}
            value={project.scores[component as ScoreComponent]}
            onChange={handleSlider(component as ScoreComponent)}
          />
        ))}
      </section>

      <section className="project-card__meta">
        <label className="checkbox">
          <input type="checkbox" checked={project.readiness} onChange={handleReadiness} />
          <span>Readiness confirmed (demo live)</span>
        </label>
        <div className="project-card__comment">
          <label htmlFor={`${project.id}-comment`}>Feedback</label>
          <textarea
            id={`${project.id}-comment`}
            placeholder="Share quick feedback for the team"
            value={project.comment ?? ''}
            onChange={handleComment}
            rows={3}
          />
        </div>
      </section>

      <section>
        <TagInput value={project.userTags} onChange={handleTagsUpdate} ariaLabel={`Tags for ${project.name}`} />
      </section>
    </article>
  );
};
