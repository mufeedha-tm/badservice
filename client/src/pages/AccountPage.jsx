import { useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import { loginAccount, logoutAccount, registerAccount } from '../services/api.js';

export default function AccountPage() {
  const { account, setAccount, status } = useAccount();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signedInAccount = mode === 'register'
        ? await registerAccount({ name: form.name, email: form.email, password: form.password })
        : await loginAccount({ email: form.email, password: form.password });
      setAccount(signedInAccount);
      setForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError('');
    setIsSubmitting(true);
    try {
      await logoutAccount();
      setAccount(null);
      setMode('login');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to sign out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <section className="account-page" aria-labelledby="account-page-title">
        <p className="account-page__eyebrow">BadService.in</p>
        {status === 'loading' && <p role="status">Checking your account...</p>}
        {status === 'error' && <p className="account-form__error" role="alert">{error}</p>}
        {status === 'ready' && account && (
          <div className="account-page__signed-in">
            <h1 id="account-page-title">Welcome, {account.name}</h1>
            <p>Signed in as {account.email}</p>
            {error && <p className="account-form__error" role="alert">{error}</p>}
            <div className="account-page__actions">
              <Link className="account-page__primary-link" to="/complaints">Browse complaints</Link>
              <Link to="/file-complaint">File a complaint</Link>
              <button type="button" onClick={handleLogout} disabled={isSubmitting}>
                {isSubmitting ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
        {status === 'ready' && !account && (
          <>
            <h1 id="account-page-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
            <p className="account-page__intro">
              {mode === 'login' ? 'Access your BadService.in account.' : 'Create an account to get started.'}
            </p>
            {error && <p className="account-form__error" role="alert">{error}</p>}
            <form className="account-form" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="account-form__field">
                  <label htmlFor="account-name">Name</label>
                  <input
                    id="account-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
              <div className="account-form__field">
                <label htmlFor="account-email">Email</label>
                <input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="account-form__field">
                <label htmlFor="account-password">Password</label>
                <input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              {mode === 'register' && (
                <div className="account-form__field">
                  <label htmlFor="account-confirm-password">Confirm password</label>
                  <input
                    id="account-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
              <button className="account-form__submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
            <p className="account-page__switch">
              {mode === 'login' ? 'New to BadService.in?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </section>
    </MainLayout>
  );
}