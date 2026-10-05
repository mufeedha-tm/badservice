import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, sendOtp, verifyOtp } from '../../services/api.js';

export default function OtpVerification({
  email,
  onEmailChange,
  verified,
  onVerified,
  t,
  error,
}) {
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown(seconds = 60) {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (!email || !email.trim()) {
      setRequestError(t('errEmail'));
      return;
    }

    setIsSending(true);
    setRequestError('');
    setStatusMessage('');

    try {
      await sendOtp({ email: email.trim() });
      setSent(true);
      startCountdown(60);
      setStatusMessage(`OTP sent to ${email.trim()}`);
    } catch (err) {
      setRequestError(getErrorMessage(err, t('otpSendFailed')));
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length !== 6) {
      setRequestError('Enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setRequestError('');
    try {
      const result = await verifyOtp({ email: email.trim(), otp: otp.trim() });
      if (timerRef.current) clearInterval(timerRef.current);
      onVerified(result);
      setStatusMessage('✓ Email verified');
    } catch (err) {
      setRequestError(getErrorMessage(err, t('otpVerifyFailed')));
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="otp-reference-fields">
      <label className="field">
        <span>{t('email')} *</span>
        <div className="otp-inline-row">
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value);
              setSent(false);
              setOtp('');
              setStatusMessage('');
              setRequestError('');
            }}
            disabled={verified}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            className={error && !email ? 'is-invalid' : ''}
            required
          />
          <button
            type="button"
            className="otp-reference-button"
            onClick={handleSendOtp}
            disabled={isSending || verified || !email?.trim() || countdown > 0}
          >
            {isSending
              ? t('sendingOtp')
              : countdown > 0
                ? `${t('resendOtp')} (${countdown}s)`
                : sent
                  ? t('resendOtp')
                  : t('sendOtp')}
          </button>
        </div>
      </label>

      {sent && !verified && (
        <div className="otp-status-notice">
          <span className="otp-status-text">OTP sent to <strong>{email}</strong></span>
          {countdown > 0 ? (
            <span className="otp-countdown-text">
              {t('resendAvailableIn')}<strong>{countdown}s</strong>
            </span>
          ) : (
            <span className="otp-countdown-ready">You can now request a new code if needed.</span>
          )}
        </div>
      )}

      {!verified && (
        <label className="field">
          <span>{t('enterOtp')} *</span>
          <div className="otp-inline-row">
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('otpPlaceholder')}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={!sent}
              className={requestError ? 'is-invalid' : ''}
            />
            <button
              type="button"
              className="otp-reference-button otp-reference-button--verify"
              onClick={handleVerifyOtp}
              disabled={!sent || isVerifying || otp.length !== 6}
            >
              {isVerifying ? t('verifyingOtp') : t('verifyOtp')}
            </button>
          </div>
        </label>
      )}

      {verified && (
        <div className="otp-verified-badge" role="status">
          ✓ {t('otpVerified')}
        </div>
      )}

      {requestError && (
        <small className="field-error" role="alert">
          {requestError}
        </small>
      )}
      {!verified && error && !requestError && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
