import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { FeedCacheProvider } from './context/FeedCacheContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeedCacheProvider>
          <ProfileProvider>
            <Toaster position="bottom-right" />
            <App />
          </ProfileProvider>
        </FeedCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
