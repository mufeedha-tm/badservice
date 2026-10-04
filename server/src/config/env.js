import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  production: process.env.NODE_ENV === 'production',

  dbHost: process.env.DB_HOST || 'srv843.hstgr.io',
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || 'u523277800_badservice_app',
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME || 'u523277800_badservice_app',

  otpSecret: process.env.OTP_SECRET || '',
  otpDevEcho: process.env.OTP_DEV_ECHO === 'true',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  otpMethod: process.env.OTP_METHOD || 'email',
};