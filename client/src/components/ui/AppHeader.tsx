import { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SettingsMenu from './SettingsMenu';
import './AppHeader.css';

interface AppHeaderProps {
  children?: ReactNode;
}

export default function AppHeader({ children }: AppHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Link to="/" className="app-header-brand">
        <img src="/ft-logo.png" alt="" className="app-header-logo" />
        Focused <span className="app-header-brand-accent">Tube</span>
      </Link>
      <nav className="app-header-nav" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => `app-header-nav-link${isActive ? ' app-header-nav-link--active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/community" className={({ isActive }) => `app-header-nav-link${isActive ? ' app-header-nav-link--active' : ''}`}>
          Community
        </NavLink>
      </nav>
      <div className="app-header-center">
        {children}
      </div>
      <div className="app-header-controls">
        {user?.avatarUrl && (
          <img src={user.avatarUrl} alt={user.name} className="app-header-avatar" />
        )}
        <SettingsMenu />
      </div>
    </header>
  );
}
