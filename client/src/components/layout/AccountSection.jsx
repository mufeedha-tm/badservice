import { Link } from 'react-router-dom';
import { useAccount } from '../../context/AccountContext.jsx';

export default function AccountSection() {
  const { account } = useAccount();

  if (account) {
    return (
      <Link className="account-section" to="/account" aria-label={`Account profile for ${account.name}`}>
        <span>Hello, {account.name?.split(' ')[0] || 'User'}</span>
        <br />
        <strong>{account.role === 'ADMIN' ? 'Admin / Account' : 'My Complaints'}</strong>
      </Link>
    );
  }

  return (
    <Link className="account-section" to="/account" aria-label="Sign in or view account">
      <span>Sign In / Register</span>
      <br />
      <strong>Account</strong>
    </Link>
  );
}