import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

function renderLoginPage(route = '/login') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    });

    it('renders a status live region while auth is loading', () => {
      renderLoginPage();

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
    });

    it('includes visually hidden loading text for screen readers', () => {
      renderLoginPage();

      expect(screen.getByText('Loading, please wait...')).toBeInTheDocument();
    });

    it('hides the decorative spinner from assistive technology', () => {
      const { container } = renderLoginPage();

      const spinner = container.querySelector('.login-spinner');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not render the sign-in button while loading', () => {
      renderLoginPage();

      expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('redirects when user is already signed in', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'a@b.com', name: 'Test', avatarUrl: null },
        isLoading: false,
      });

      const { container } = renderLoginPage();

      expect(container.querySelector('.login-page')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    });

    it('renders the sign-in button', () => {
      renderLoginPage();

      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('renders the page heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('does not render an error banner when no error param is present', () => {
      renderLoginPage();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders an error banner for a known error code', () => {
      renderLoginPage('/login?error=oauth_failed');

      expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in failed');
    });
  });
});
