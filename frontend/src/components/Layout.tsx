import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from './Button';
import { LogoIcon, HomeIcon } from './icons';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  sidebarContent?: ReactNode;
}

export default function Layout({ children, title, sidebarContent }: LayoutProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isSmartArrange = location.pathname === '/smart-arrange';

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
          <LogoIcon size={32} />
          <span>QUITIO</span>
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
              className={`sidebar-item ${isHome ? 'active' : ''}`}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <HomeIcon /> Home
            </div>
            <div
              id="nav-smart-arrange"
              className={`sidebar-item ${isSmartArrange ? 'active' : ''}`}
              onClick={() => navigate('/smart-arrange')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: isSmartArrange ? 'var(--color-primary)' : undefined,
              }}
            >
              🧠 Smart Arrange
            </div>
          </div>
          {sidebarContent}
        </aside>

        {/* Main Content */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
