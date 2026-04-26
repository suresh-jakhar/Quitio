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
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar-wrapper">
        <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <LogoIcon size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.1rem' }}>QUITIO</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-title" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', letterSpacing: '0.05rem' }}>Navigation</div>
            <div
              className={`sidebar-item ${isHome ? 'active' : ''}`}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}
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
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) 0',
                color: isSmartArrange ? 'var(--color-primary)' : undefined,
              }}
            >
              🧠 Smart Arrange
            </div>
            <div
              id="nav-ai-assistant"
              className={`sidebar-item ${location.pathname === '/chat' ? 'active' : ''}`}
              onClick={() => navigate('/chat')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) 0',
                color: location.pathname === '/chat' ? 'var(--color-primary)' : undefined,
              }}
            >
              💬 AI Assistant
            </div>
          </div>
          {sidebarContent}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: 'var(--space-xl)' }}>
          {user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <Button
                label="Logout"
                variant="danger"
                size="sm"
                onClick={handleLogout}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="main-header" style={{ height: '64px', display: 'flex', alignItems: 'center', padding: '0 var(--space-2xl)', borderBottom: '1px solid var(--color-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))' }}>
           <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
             {title || 'Knowledge Management'}
           </h2>
        </header>
        <main className="main-content" style={{ overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
