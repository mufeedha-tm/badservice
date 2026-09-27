import { Link } from 'react-router-dom';
import { useAccount } from '../../context/AccountContext.jsx';

export default function AccountSection() {
  const { account } = useAccount();

  return (
    <Link className="account-section" to="/account" aria-label="Sign in or view account">
      <span>Hello, {account?.name || 'Sign in'}</span>
      <br />
      <strong>Account</strong>
    </Link>
  );
}