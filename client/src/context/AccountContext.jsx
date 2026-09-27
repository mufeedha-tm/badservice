import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentAccount } from '../services/api.js';

const AccountContext = createContext({ account: null, status: 'loading', setAccount: () => {} });

export function AccountProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCurrent = true;

    getCurrentAccount()
      .then((currentAccount) => {
        if (isCurrent) {
          setAccount(currentAccount);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (isCurrent) setStatus('ready');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <AccountContext.Provider value={{ account, status, setAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}