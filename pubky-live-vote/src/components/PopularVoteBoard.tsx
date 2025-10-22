import { DragEvent, useMemo, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import './PopularVoteBoard.css';
import './Panel.css';

export const PopularVoteBoard = () => {
  const { projects, popularRanking, setPopularRanking, userProjectId, setUserProjectId } = useProjects();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const selectableProjects = useMemo(
    () =>
      projects.filter((project) => project.id !== userProjectId).sort((a, b) => a.name.localeCompare(b.name)),
    [projects, userProjectId]
  );

  const addToRanking = (projectId: string) => {
    if (popularRanking.includes(projectId)) return;
    setPopularRanking([...popularRanking, projectId]);
  };

  const removeFromRanking = (projectId: string) => {
    setPopularRanking(popularRanking.filter((id) => id !== projectId));
  };

  const onDragStart = (event: DragEvent<HTMLLIElement>, projectId: string) => {
    setDraggedId(projectId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const newOrder = [...popularRanking];
    const from = newOrder.indexOf(draggedId);
    const to = newOrder.indexOf(targetId);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, draggedId);
    setPopularRanking(newOrder);
  };

  const onDragEnd = () => setDraggedId(null);

  return (
    <div className="panel popular">
      <header className="panel__header">
        <div>
          <h2>Popular Vote</h2>
          <p className="panel__subtitle">Rank up to five favourite projects. Self votes are blocked automatically.</p>
        </div>
      </header>

      <div className="popular__body">
        <label className="popular__self-select">
          <span>My project</span>
          <select value={userProjectId ?? ''} onChange={(event) => setUserProjectId(event.target.value || null)}>
            <option value="">I&apos;m not competing</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <section>
          <h3>Available projects</h3>
          <ul className="popular__pool">
            {selectableProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={popularRanking.includes(project.id)}
                  onClick={() => addToRanking(project.id)}
                >
                  {project.name}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="popular__ranking">
          <h3>Ranking</h3>
          <ol>
            {popularRanking.map((projectId, index) => {
              const project = projects.find((item) => item.id === projectId);
              if (!project) return null;
              return (
                <li
                  key={projectId}
                  draggable
                  onDragStart={(event) => onDragStart(event, projectId)}
                  onDragOver={(event) => onDragOver(event, projectId)}
                  onDragEnd={onDragEnd}
                >
                  <span className="popular__position">#{index + 1}</span>
                  <span className="popular__name">{project.name}</span>
                  <button type="button" onClick={() => removeFromRanking(projectId)} aria-label={`Remove ${project.name}`}>
                    ×
                  </button>
                </li>
              );
            })}
          </ol>
          {popularRanking.length === 0 && <p className="popular__empty">Select favourites to start ranking them.</p>}
        </section>
      </div>
    </div>
  );
};
