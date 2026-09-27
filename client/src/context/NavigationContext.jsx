import { createContext, useContext, useEffect, useState } from 'react';
import { getNavigation } from '../services/api.js';

const NavigationContext = createContext({ navigation: null, status: 'loading' });

export function NavigationProvider({ children }) {
  const [navigation, setNavigation] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCurrent = true;

    getNavigation()
      .then((data) => {
        if (isCurrent) {
          setNavigation(data);
          setStatus('success');
        }
      })
      .catch(() => {
        if (isCurrent) setStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ navigation, status }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}