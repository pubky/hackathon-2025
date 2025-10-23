import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { LoginCard } from './LoginCard';
import { ProjectList } from './ProjectList';
import { Leaderboard } from './Leaderboard';
import { MyProjectPanel } from './MyProjectPanel';
import { SubmissionBanner } from './SubmissionBanner';
import './Layout.css';

export const Layout = () => {
  const { session } = useAuth();
  const { submitBallot, hasPendingChanges, lastSubmittedAt } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav__brand" aria-label="Pubky">
          <span className="top-nav__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <defs>
                <linearGradient id="pubky-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#58ffe8" />
                  <stop offset="100%" stopColor="#b58cff" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" fill="url(#pubky-logo)" />
              <circle cx="12" cy="12" r="5.2" fill="#0c1019" />
            </svg>
          </span>
          <span className="top-nav__brand-name">Pubky</span>
        </div>
        <form
          className="top-nav__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            id="project-search"
            type="search"
            placeholder="Search projects, teams, or tags"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>
      </nav>
      <header className="app-header">
        <div className="app-header__copy">
          <h1>Pubky Live Vote</h1>
          <p className="subtitle">Real-time scoring and tagging for the Pubky Hackathon</p>
        </div>
        <SubmissionBanner
          hasPendingChanges={hasPendingChanges}
          lastSubmittedAt={lastSubmittedAt}
          onSubmit={submitBallot}
          isAuthenticated={Boolean(session)}
        />
      </header>

      <main className="app-main">
        <section className="left-column">
          <LoginCard />
          {session && <MyProjectPanel />}
        </section>
        <section className="right-column">
          <ProjectList searchQuery={searchQuery} />
        </section>
      </main>

      <footer className="app-footer">
        <Leaderboard />
      </footer>
    </div>
  );
};
