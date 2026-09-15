import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MotivationBar from './MotivationBar';
import SettingsModal from './SettingsModal';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to exercise</a>

      <MotivationBar />

      <div className="app-layout">
        <button
          className="sidebar-hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar isOpen={sidebarOpen} />

        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <button
        className="settings-gear-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.32.07-.64.07-.98s-.03-.66-.07-1l2.16-1.68c.19-.15.24-.42.12-.64l-2.06-3.56c-.12-.22-.39-.3-.61-.22l-2.55 1.03c-.52-.4-1.08-.73-1.69-.98l-.38-2.71C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.71c-.61.25-1.17.59-1.69.98L4.89 5.08c-.23-.09-.49 0-.61.22L2.22 8.86c-.12.21-.08.49.12.64L4.5 11.18c-.04.34-.07.67-.07 1s.03.65.07.98l-2.16 1.68c-.19.15-.24.42-.12.64l2.06 3.56c.12.22.39.3.61.22l2.55-1.03c.52.4 1.08.73 1.69.98l.38 2.71c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.71c.61-.25 1.17-.58 1.69-.98l2.55 1.03c.22.08.49 0 .61-.22l2.06-3.56c.12-.22.07-.49-.12-.64l-2.16-1.68z"/>
        </svg>
      </button>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
