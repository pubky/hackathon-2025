import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LogoutButton() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center space-x-1.5 text-warm-600 hover:text-coral-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-coral-50"
      title="Sign Out"
    >
      <LogOut className="w-4 h-4" />
      <span className="text-xs font-semibold">Sign Out</span>
    </button>
  );
}
