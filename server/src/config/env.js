import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  production: process.env.NODE_ENV === 'production',

  // Database
  dbHost: process.env.DB_HOST || 'srv843.hstgr.io',
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || 'u523277800_badservice_app',
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME || 'u523277800_badservice_app',

  // OTP Configuration
  otpSecret: process.env.OTP_SECRET || 'b66bb716393bc284ede6922100ee603170fddd529c572baca5b38dd63ce6f553',
  otpMethod: 'email',
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS) || 600,
  otpCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,

  // Gmail API (Official OAuth2)
  gmailClientId: process.env.GMAIL_CLIENT_ID || '',
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || '',
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
  gmailSenderEmail: process.env.GMAIL_SENDER_EMAIL || '',

  // Single Admin Account Configuration
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',

  // Session & JWT
  sessionSecret: process.env.SESSION_SECRET || 'badservice-super-secret-session-key',

  // Cloudinary / Object Storage (Optional for persistent complaint media)
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};