
import dns from 'node:dns';
import app from './app.js';
import { env } from './config/env.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignored on legacy environments
}

app.listen(env.port, '0.0.0.0', () => {
  console.log(`BadService API listening on port ${env.port}`);
});