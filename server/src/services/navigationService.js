import * as navigationRepository from '../repositories/inMemoryNavigationRepository.js';

export function getNavigation() {
  return navigationRepository.findNavigation();
}