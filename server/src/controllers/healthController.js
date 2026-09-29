import { getHealthStatus } from '../services/healthService.js';

export async function getHealth(_request, response) {
  const health = await getHealthStatus();
  response.json({
    success: true,
    data: health,
  });
}