import dns from 'node:dns';
import mysql from 'mysql2/promise';
import { env } from './env.js';

let dbHost = env.dbHost;
// Explicitly resolve to IPv4 address to prevent Windows/Node IPv6 ENETUNREACH timeouts
if (dbHost && !/^(\d{1,3}\.){3}\d{1,3}$/.test(dbHost)) {
  try {
    const lookupResult = await dns.promises.lookup(dbHost, { family: 4 });
    if (lookupResult?.address) {
      dbHost = lookupResult.address;
    }
  } catch (err) {
    console.warn(`Could not resolve ${dbHost} to IPv4:`, err.message);
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
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
});

export default pool;
