import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps): JSX.Element {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user') || '{}')
    : null;

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="header-logo" onClick={() => navigate('/')}>
          📚 QUITIO
        </div>
        <div className="header-content">
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-medium)' }}>
            {title || 'Knowledge Management'}
          </h2>
          <div className="header-nav">
            {user && (
              <>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {user.email}
                </span>
                <Button
                  label="Logout"
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="app-container">
        {/* Sidebar - Placeholder for Phase 6+ */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Navigation</div>
            <div
              className="sidebar-item active"
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            >
              🏠 Home
            </div>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">Coming Soon</div>
            <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default' }}>
              🏷️ Tags
            </div>
            <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default' }}>
              🔍 Search
            </div>
            <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default' }}>
              💬 Chat
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
