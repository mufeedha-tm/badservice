import { useState } from 'react';
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
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState('');
  const [fieldError, setFieldError] = useState('');

  async function handleSend() {
    setFieldError('');
    setStatus('');
    setSending(true);
    try {
      const result = await sendOtp(phone);
      setStatus(result.message || t('otpSent'));
    } catch (err) {
      setFieldError(getErrorMessage(err, t('otpSendFailed')));
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setFieldError('');
    setVerifying(true);
    try {
      const result = await verifyOtp({ phone, otp });
      onVerified(result);
      setStatus(t('otpVerified'));
    } catch (err) {
      setFieldError(getErrorMessage(err, t('otpVerifyFailed')));
    } finally {
      setVerifying(false);
    }
  }

  return (
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
          />
          <button type="button" className="otp-panel__action" onClick={handleSend} disabled={sending || verified}>
            {sending ? t('sendingOtp') : t('sendOtp')}
          </button>
        </div>
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
          />
          <button type="button" className="otp-panel__action otp-panel__action--verify" onClick={handleVerify} disabled={verifying || verified}>
            {verifying ? t('verifyingOtp') : t('verifyOtp')}
          </button>
        </div>
      </label>

      {(status || verified) && (
        <p className="otp-panel__status" role="status">
          {verified ? t('otpVerified') : status}
        </p>
      )}
      {(fieldError || error) && (
        <small className="field-error" role="alert">{fieldError || error}</small>
      )}
    </div>
  );
}
