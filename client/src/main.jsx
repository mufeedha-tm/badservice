import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AccountProvider } from './context/AccountContext.jsx';
import App from './App.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';
import './styles/theme.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NavigationProvider>
        <AccountProvider>
          <App />
        </AccountProvider>
      </NavigationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);