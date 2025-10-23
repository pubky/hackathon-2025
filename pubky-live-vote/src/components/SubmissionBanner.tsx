import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './SubmissionBanner.css';
import './Panel.css';

dayjs.extend(relativeTime);

interface Props {
  hasPendingChanges: boolean;
  lastSubmittedAt: string | null;
  onSubmit: () => Promise<void>;
  isAuthenticated: boolean;
}

export const SubmissionBanner = ({ hasPendingChanges, lastSubmittedAt, onSubmit, isAuthenticated }: Props) => {
  const status = (() => {
    if (!isAuthenticated) {
      return 'Connect with Pubky to submit your ballot.';
    }
    if (hasPendingChanges) {
      return lastSubmittedAt
        ? 'You have unsaved changes. Update to sync with the homeserver.'
        : 'You have unsaved changes. Submit to sync with the homeserver.';
    }
    if (lastSubmittedAt) {
      return `Ballot synced ${dayjs(lastSubmittedAt).fromNow()}. Make updates any time.`;
    }
    return 'Fill in the scores and submit your ballot when ready.';
  })();

  const buttonLabel = lastSubmittedAt ? 'Update my ballot' : 'Submit my ballot';
  const isDisabled = !isAuthenticated || (Boolean(lastSubmittedAt) && !hasPendingChanges);

  return (
    <div className="submission-banner">
      <div>
        <p>{status}</p>
      </div>
      <button className="button" disabled={isDisabled} onClick={() => void onSubmit()}>
        {buttonLabel}
      </button>
    </div>
  );
};
