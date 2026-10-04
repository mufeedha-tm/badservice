import { useEffect, useState } from 'react';
import {
  getErrorMessage,
  sendOtp,
  verifyOtp,
} from '../../services/api.js';

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
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState('');
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    setOtp('');
    setSent(false);
    setStatus('');
    setRequestError('');
  }, [phone, email]);

  async function handleSendOtp() {
    setIsSending(true);
    setRequestError('');
    setStatus('');

    try {
      const result = await sendOtp({ phone, email });
      setSent(true);
      setStatus(result.message || t('otpSent'));
    } catch (sendError) {
      setRequestError(
        getErrorMessage(sendError, t('otpSendFailed'))
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp() {
    setIsVerifying(true);
    setRequestError('');
    setStatus('');

    try {
      const result = await verifyOtp({ phone, otp });
      onVerified(result);
      setStatus(t('otpVerified'));
    } catch (verifyError) {
      setRequestError(
        getErrorMessage(verifyError, t('otpVerifyFailed'))
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <>
      <label className="field">
        <span>{t('mobile')} *</span>
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          autoComplete="tel"
          className={error ? 'is-invalid' : ''}
          aria-invalid={Boolean(error)}
        />
        {!verified && (
          <button
            type="button"
            className="ghost-cta"
            onClick={handleSendOtp}
            disabled={isSending || !phone.trim() || !email.trim()}
          >
            {isSending ? t('sendingOtp') : t('sendOtp')}
          </button>
        )}
        {error && <small className="field-error">{error}</small>}
      </label>

      <label className="field">
        <span>{t('email')} *</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      {sent && !verified && (
        <label className="field">
          <span>{t('enterOtp')}</span>
          <div className="complaint-form-actions">
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength={6}
            />
            <button
              type="button"
              className="ghost-cta"
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? t('verifyingOtp') : t('verifyOtp')}
            </button>
          </div>
        </label>
      )}

      {status && !verified && (
        <small className="field-hint" role="status">
          {status}
        </small>
      )}
      {requestError && (
        <small className="field-error" role="alert">
          {requestError}
        </small>
      )}
      {verified && (
        <small className="field-hint" role="status">
          {t('otpVerified')}
        </small>
      )}
    </>
  );
}
