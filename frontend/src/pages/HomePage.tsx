import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '../types/auth';
import '../styles/home.css';

function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>QUITIO</h1>
        <div className="user-menu">
          <span>{user.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="home-main">
        <h2>Welcome to QUITIO</h2>
        <p>Knowledge Management App</p>
        <p>Phase 2: Authentication ✅ Complete</p>
        <p>Next: Phase 3 - Database Schema & Phase 4 - Backend API</p>
      </main>
    </div>
  );
}

export default HomePage;
