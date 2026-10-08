import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, sendOtp, verifyOtp } from '../../services/api.js';

export default function OtpVerification({
  phone,
  onPhoneChange,
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
  const verificationInProgressRef = useRef(false);

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
    if (!phone || !phone.trim()) {
      setRequestError(t('errPhoneReq'));
      return;
    }

    setIsSending(true);
    setRequestError('');
    setStatusMessage('');

    try {
      const result = await sendOtp({ phone: phone.trim() });
      setSent(true);
      startCountdown(60);
      if (result.testCode) {
        window.alert(`${t('otpTestCode')} ${result.testCode}`);
      }
      setStatusMessage(
        result.testCode
          ? `${t('otpDemoSent')} ${result.testCode})`
          : result.message || `${t('otpSent')} ${phone.trim()}`
      );
    } catch (err) {
      setRequestError(getErrorMessage(err, t('otpSendFailed')));
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp(code = otp) {
    if (!code || code.length !== 6) {
      setRequestError('Enter the 6-digit verification code.');
      return;
    }
    if (verificationInProgressRef.current) return;

    verificationInProgressRef.current = true;
    setIsVerifying(true);
    setRequestError('');
    try {
      const result = await verifyOtp({ phone: phone.trim(), otp: code.trim() });
      if (timerRef.current) clearInterval(timerRef.current);
      onVerified(result);
      setStatusMessage(`✓ ${t('otpVerified')}`);
    } catch (err) {
      setRequestError(getErrorMessage(err, t('otpVerifyFailed')));
    } finally {
      verificationInProgressRef.current = false;
      setIsVerifying(false);
    }
  }

  return (
    <div className="otp-reference-fields">
      <label className="field">
        <span>{t('mobile')} *</span>
        <div className="otp-inline-row">
          <input
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              onPhoneChange(e.target.value);
              if (timerRef.current) clearInterval(timerRef.current);
              setSent(false);
              setOtp('');
              setStatusMessage('');
              setRequestError('');
              setCountdown(0);
            }}
            disabled={verified}
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            className={error && !phone ? 'is-invalid' : ''}
            required
          />
          <button
            type="button"
            className="otp-reference-button"
            onClick={handleSendOtp}
            disabled={isSending || verified || !phone?.trim() || countdown > 0}
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
          <span className="otp-status-text">
            {statusMessage || `${t('otpSent')} ${phone}`}
          </span>
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
              onChange={(e) => {
                const nextOtp = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(nextOtp);
                setRequestError('');
                if (nextOtp.length === 6) handleVerifyOtp(nextOtp);
              }}
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
          {statusMessage || `✓ ${t('otpVerified')}`}
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
