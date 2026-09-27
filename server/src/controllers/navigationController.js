import { getNavigation } from '../services/navigationService.js';

export async function getNavigationData(_request, response) {
  const navigation = await getNavigation();
  response.json({ success: true, data: navigation });
}