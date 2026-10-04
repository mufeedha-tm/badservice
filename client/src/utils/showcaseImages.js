export const showcaseImages = {
  Computers: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85',
  Mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85',
  'Vehicles & Automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85',
  'Hospital & Healthcare': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85',
  'Hotel & Travel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
  'Flights & Trains': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=85',
  'Restaurants & Food': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
  Fashion: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85',
  Banking: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85',
  Telecom: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=85',
};

export const categoryIcons = {
  Mobiles: '◉',
  Computers: '▣',
  'TV & Electronics': '▤',
  Fashion: '◇',
  'Hospital & Healthcare': '+',
  'Vehicles & Automotive': '◆',
  'Hotel & Travel': '⌂',
  'Restaurants & Food': '•',
  'Flights & Trains': '✈',
  Banking: '₹',
  Telecom: '⌁',
};

export function getShowcaseImage(category = '') {
  return showcaseImages[category] || showcaseImages.Computers;
}
