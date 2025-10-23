import { ChangeEvent } from 'react';
import type { Project, ScoreComponent } from '../types/project';
import { getTagTone } from '../utils/tagTone';
import { ScoreSlider } from './ScoreSlider';
import { TagInput } from './TagInput';
import './ProjectCard.css';

interface Props {
  project: Project;
  onScoreChange: (projectId: string, component: ScoreComponent, value: number) => void;
  onReadinessToggle: (projectId: string, ready: boolean) => void;
  onCommentChange: (projectId: string, comment: string) => void;
  onTagsChange: (projectId: string, tags: string[]) => void;
  isOwnProject?: boolean;
}

const SCORE_LABELS: Record<ScoreComponent, string> = {
  complexity: 'Complexity',
  creativity: 'Creativity / Practicality',
  presentation: 'Team Presentation',
  feedback: 'Feedback Quality'
};

export const ProjectCard = ({
  project,
  onScoreChange,
  onReadinessToggle,
  onCommentChange,
  onTagsChange,
  isOwnProject = false
}: Props) => {
  const handleSlider = (component: ScoreComponent) => (value: number) => {
    if (isOwnProject) return;
    onScoreChange(project.id, component, value);
  };

  const handleComment = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (isOwnProject) return;
    onCommentChange(project.id, event.target.value);
  };

  const handleReadiness = (event: ChangeEvent<HTMLInputElement>) => {
    if (isOwnProject) return;
    onReadinessToggle(project.id, event.target.checked);
  };

  const handleTagsUpdate = (tags: string[]) => {
    if (isOwnProject) return;
    onTagsChange(project.id, tags);
  };

  return (
    <article
      className={`project-card${isOwnProject ? ' project-card--own' : ''}`}
      aria-label={`Project ${project.name}`}
    >
      <header className="project-card__header">
        <div>
          <h3>{project.name}</h3>
          <p className="project-card__description">{project.description}</p>
        </div>
        <div className="project-card__tags" aria-label="Project topics">
          {project.tags.map((tag) => (
            <span key={tag} className={`tag ${getTagTone(tag)}`}>
              #{tag}
            </span>
          ))}
        </div>
        {project.teamMembers?.length ? (
          <div className="project-card__team" aria-label="Project team">
            <span className="project-card__team-label">Team</span>
            <div className="project-card__team-tags">
              {project.teamMembers.map((member) => (
                <span key={member} className="tag tag--team">
                  {member.startsWith('@') ? member : `@${member}`}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <section className="project-card__scores" aria-disabled={isOwnProject}>
        {Object.entries(SCORE_LABELS).map(([component, label]) => (
          <ScoreSlider
            key={component}
            label={label}
            value={project.scores[component as ScoreComponent]}
            disabled={isOwnProject}
            onChange={handleSlider(component as ScoreComponent)}
          />
        ))}
      </section>

      <section className="project-card__meta" aria-disabled={isOwnProject}>
        <label className="checkbox">
          <input type="checkbox" checked={project.readiness} onChange={handleReadiness} disabled={isOwnProject} />
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
            disabled={isOwnProject}
          />
        </div>
      </section>

      <section>
        <TagInput
          value={project.userTags}
          onChange={handleTagsUpdate}
          ariaLabel={`Tags for ${project.name}`}
          disabled={isOwnProject}
        />
      </section>
      {isOwnProject && (
        <p className="project-card__own-hint" role="status">
          You can&apos;t score or tag your own project. These fields stay read-only.
        </p>
      )}
    </article>
  );
};
