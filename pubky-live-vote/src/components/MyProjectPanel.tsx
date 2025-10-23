import { ChangeEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import './MyProjectPanel.css';
import './Panel.css';

export const MyProjectPanel = () => {
  const { projects, userProjectId, setUserProjectId } = useProjects();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setUserProjectId(value || null);
  };

  return (
    <div className="panel my-project">
      <header className="panel__header">
        <div>
          <h2>My project</h2>
          <p className="panel__subtitle">
            Select your team to disable self-voting and exclude your project from submissions.
          </p>
        </div>
      </header>
      <div className="my-project__body">
        <label className="my-project__label">
          <span>My project</span>
          <select value={userProjectId ?? ''} onChange={handleChange}>
            <option value="">I&apos;m not competing</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <p className="my-project__hint">Only one project can be selected per voter.</p>
      </div>
    </div>
  );
};
