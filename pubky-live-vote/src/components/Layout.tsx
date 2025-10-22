import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { LoginCard } from './LoginCard';
import { ProjectList } from './ProjectList';
import { Leaderboard } from './Leaderboard';
import { PopularVoteBoard } from './PopularVoteBoard';
import { SubmissionBanner } from './SubmissionBanner';
import './Layout.css';

export const Layout = () => {
  const { user } = useAuth();
  const { submitBallot, hasPendingChanges, lastSubmittedAt } = useProjects();

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
        <form className="top-nav__search" role="search">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input id="project-search" type="search" placeholder="Search projects, teams, or tags" />
        </form>
        <div className="top-nav__actions">
          <div className="top-nav__action">
            <button type="button" aria-label="Toggle theme">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <path
                  d="M12 3a1 1 0 0 0-1 1v1.07a7.002 7.002 0 0 0-5.93 5.93H4a1 1 0 1 0 0 2h1.07a7.002 7.002 0 0 0 5.93 5.93V20a1 1 0 1 0 2 0v-1.07a7.002 7.002 0 0 0 5.93-5.93H20a1 1 0 1 0 0-2h-1.07A7.002 7.002 0 0 0 13 5.07V4a1 1 0 0 0-1-1Zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <span className="top-nav__action-label" aria-hidden="true">
              Theme
            </span>
          </div>
          <div className="top-nav__action">
            <button type="button" aria-label="Notifications">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <path
                  d="M12 2a6 6 0 0 0-6 6v3.382l-.894 2.236A1 1 0 0 0 6.05 15H9a3 3 0 1 0 6 0h2.95a1 1 0 0 0 .944-1.382L18 11.382V8a6 6 0 0 0-6-6Zm0 18a1 1 0 0 1-1-1h2a1 1 0 0 1-1 1Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <span className="top-nav__action-label" aria-hidden="true">
              Alerts
            </span>
          </div>
          <div className="top-nav__action">
            <button type="button" className="top-nav__avatar" aria-label="Account">
              <span aria-hidden="true">{user?.displayName?.[0]?.toUpperCase() ?? '•'}</span>
            </button>
            <span className="top-nav__action-label" aria-hidden="true">
              Account
            </span>
          </div>
        </div>
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
          isAuthenticated={Boolean(user)}
        />
      </header>

      <main className="app-main">
        <section className="left-column">
          <LoginCard />
          {user && <PopularVoteBoard />}
        </section>
        <section className="right-column">
          <ProjectList />
        </section>
      </main>

      <footer className="app-footer">
        <Leaderboard />
      </footer>
    </div>
  );
};
