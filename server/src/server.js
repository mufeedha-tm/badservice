import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`BadService API listening on port ${env.port}`);
});