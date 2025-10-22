import { Fragment } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ProjectCard } from './ProjectCard';
import './ProjectList.css';
import './Panel.css';

export const ProjectList = () => {
  const { projects, updateProjectScore, toggleReadiness, updateComment, updateTags } = useProjects();

  return (
    <div className="panel project-list">
      <header className="panel__header">
        <div>
          <h2>Projects</h2>
          <p className="panel__subtitle">Score projects across the rubric, leave feedback, and apply tags.</p>
        </div>
      </header>
      <div className="project-list__grid">
        {projects.map((project) => (
          <Fragment key={project.id}>
            <ProjectCard
              project={project}
              onScoreChange={updateProjectScore}
              onReadinessToggle={toggleReadiness}
              onCommentChange={updateComment}
              onTagsChange={updateTags}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
};
