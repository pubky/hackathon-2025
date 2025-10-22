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
      <header className="app-header">
        <div>
          <h1>Pubky Live Vote</h1>
          <p className="subtitle">Real-time voting for the Pubky Hackathon</p>
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
