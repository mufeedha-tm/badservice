import dns from 'node:dns';
import mysql from 'mysql2/promise';
import { env } from './env.js';

// Prioritize IPv4 globally to avoid IPv6 connection timeouts (ETIMEDOUT) on cloud hosting (Render/AWS)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignored on legacy environments
}

let dbHost = env.dbHost;
if (dbHost && !/^(\d{1,3}\.){3}\d{1,3}$/.test(dbHost)) {
  try {
    const lookup = await dns.promises.lookup(dbHost, { family: 4 });
    if (lookup?.address) {
      dbHost = lookup.address;
    }
  } catch {
    // If IPv4 lookup is unavailable, fall back to configured hostname
    dbHost = env.dbHost;
  }
}

const pool = mysql.createPool({
  host: dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 30000,
  decimalNumbers: true,
});

export default pool;

