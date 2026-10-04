import { useEffect, useState } from 'react';
import { getErrorMessage, sendOtp, verifyOtp } from '../../services/api.js';

const RESEND_SECONDS = 60;

export default function OtpVerification({
  phone,
  email,
  onPhoneChange,
  onEmailChange,
  verified,
  onVerified,
  t,
  error,
}) {
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSend() {
    setFieldError('');
    setStatus('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setFieldError(t('errEmail'));
      return;
    }
    if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phone.trim().replace(/[\s\-()]/g, ''))) {
      setFieldError(t('errPhoneInv'));
      return;
    }
    if (cooldown > 0) return;

    setSending(true);
    try {
      const result = await sendOtp({ phone, email });
      setStatus(result.message || t('otpSent'));
      setCooldown(RESEND_SECONDS);
      setToast({ tone: 'success', title: 'OTP sent', message: 'Enter the 6-digit code sent to your email address.' });
    } catch (err) {
      const message = getErrorMessage(err, t('otpSendFailed'));
      setFieldError(message);
      setToast({ tone: 'error', title: 'Unable to send OTP', message });
      const match = getErrorMessage(err, '').match(/wait (\d+) seconds/i);
      if (match) setCooldown(Number(match[1]));
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setFieldError('');
    setStatus('');
    if (!/^\d{6}$/.test(otp)) {
      setFieldError('Enter the 6-digit OTP sent to your email address.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyOtp({ phone, otp });
      onVerified(result);
      setStatus(t('otpVerified'));
      setToast({ tone: 'success', title: 'Email verified', message: 'Your email address has been verified.' });
    } catch (err) {
      const message = getErrorMessage(err, t('otpVerifyFailed'));
      setFieldError(message);
      setToast({ tone: 'error', title: 'Verification failed', message });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      {toast && (
        <div className={`otp-toast otp-toast--${toast.tone}`} role="status">
          <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
          <button type="button" onClick={() => setToast(null)} aria-label="Close notification">×</button>
        </div>
      )}
      <div className="otp-panel">
      <label className="field">
        <span>{t('mobile')} *</span>
        <div className="otp-panel__row">
          <input
            type="tel"
            inputMode="numeric"
            name="phone"
            value={phone}
            disabled={verified}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="10-digit mobile number"
            className={error ? 'is-invalid' : ''}
            autoComplete="tel"
            maxLength={14}
          />
          <button type="button" className="otp-panel__action" onClick={handleSend} disabled={sending || verified || cooldown > 0}>
            {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : t('sendOtp')}
          </button>
        </div>
      </label>

      <label className="field">
        <span>{t('email')} *</span>
        <input
          type="email"
          name="otp-email"
          value={email}
          disabled={verified}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      <label className="field">
        <span>{t('enterOtp')} *</span>
        <div className="otp-panel__row">
          <input
            type="text"
            inputMode="numeric"
            name="otp"
            value={otp}
            disabled={verified}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            autoComplete="one-time-code"
            maxLength={6}
            className={fieldError ? 'is-invalid' : ''}
          />
          <button type="button" className="otp-panel__action otp-panel__action--verify" onClick={handleVerify} disabled={verifying || verified}>
            {verifying ? 'Checking…' : verified ? 'Verified' : t('verifyOtp')}
          </button>
        </div>
      </label>

      {(status || verified) && (
        <div className="otp-notice otp-notice--success" role="status">
          <span className="otp-notice__icon">✓</span>
          <div><strong>{verified ? 'Email address verified' : 'OTP sent'}</strong><span>{verified ? ` ${phone}` : status}</span></div>
        </div>
      )}
      {(fieldError || error) && (
        <div className="otp-notice otp-notice--error" role="alert">
          <span className="otp-notice__icon">!</span>
          <span>{fieldError || error}</span>
        </div>
      )}
      </div>
    </>
  );
}
