// Guaranteed, offline-safe, high-speed category and brand vector icons
// Displays exact matching icon for every company, product & service:
// - Hospital -> 🏥 Hospital Icon
// - HP Computer -> 💻 Computer / HP Icon
// - IndiGo Flights -> ✈️ Flight Icon
// - Car brands (Audi, Maruti, Hyundai, Tata) -> 🚗 Car Icon
// - Motor vehicle / Bike (Royal Enfield, Bajaj, TVS, Hero) -> 🏍️ Motorbike Icon
// - Rooms / Hotel (OYO) -> 🏨 Hotel Icon
// - Phone / Mobiles (Apple, Samsung, OnePlus, Vivo) -> 📱 Phone Icon
// - Electronics / Appliances (Havells, Voltas, LG, Sony) -> ⚡/📺 Appliance Icon
// - Banking (SBI, HDFC, ICICI) -> 🏦 Bank Icon

/**
 * Returns a high-res SVG data URI or semantic icon for any company name and category
 */
export function getCompanyCategoryIcon(companyName = '', categoryName = '') {
  const name = (companyName || '').toLowerCase().trim();
  const cat = (categoryName || '').toLowerCase().trim();

  // 1. Hospital & Healthcare
  if (name.includes('hospital') || name.includes('apollo') || name.includes('clinic') || name.includes('medical') || cat.includes('hospital') || cat.includes('health')) {
    return {
      type: 'hospital',
      emoji: '🏥',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23fee2e2"/><path d="M14 20h36v32H14z" fill="%23fff" stroke="%23dc2626" stroke-width="3"/><path d="M32 26v16M24 34h16" stroke="%23dc2626" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="12" r="4" fill="%23dc2626"/></svg>`,
      label: 'Hospital & Healthcare',
      bg: '#fef2f2',
      border: '#fecaca',
      color: '#dc2626',
    };
  }

  // 2. Computers & Laptops (HP, Dell, Lenovo, Acer, Asus)
  if (name === 'hp' || name.includes('hewlett') || name.includes('dell') || name.includes('lenovo') || name.includes('acer') || name.includes('asus') || cat.includes('computer') || cat.includes('laptop')) {
    return {
      type: 'computer',
      emoji: '💻',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23e0e7ff"/><rect x="14" y="16" width="36" height="24" rx="3" fill="%23fff" stroke="%234338ca" stroke-width="3"/><path d="M10 44h44v4H10z" fill="%234338ca" rx="2"/><circle cx="32" cy="28" r="3" fill="%234338ca"/></svg>`,
      label: 'Computers & Laptops',
      bg: '#eef2ff',
      border: '#c7d2fe',
      color: '#4338ca',
    };
  }

  // 3. Flights & Airlines (IndiGo, SpiceJet, Air India, Vistara)
  if (name.includes('indigo') || name.includes('flight') || name.includes('airline') || name.includes('air india') || name.includes('spicejet') || name.includes('vistara') || cat.includes('flight') || cat.includes('air')) {
    return {
      type: 'flight',
      emoji: '✈️',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23e0f2fe"/><path d="M32 12l4 14 14 8-1 4-15-4-2 8 5 4-1 3-7-3-7 3-1-3 5-4-2-8-15 4-1-4 14-8 4-14z" fill="%230284c7"/></svg>`,
      label: 'Flights & Airlines',
      bg: '#f0f9ff',
      border: '#bae6fd',
      color: '#0284c7',
    };
  }

  // 4. Motorbikes & Two-Wheelers (Royal Enfield, Bajaj, TVS, Hero, Yamaha)
  if (name.includes('royal enfield') || name.includes('enfield') || name.includes('bajaj') || name.includes('tvs') || name.includes('hero moto') || name.includes('yamaha') || name.includes('bike')) {
    return {
      type: 'bike',
      emoji: '🏍️',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23fef3c7"/><circle cx="18" cy="40" r="9" fill="none" stroke="%23b45309" stroke-width="4"/><circle cx="46" cy="40" r="9" fill="none" stroke="%23b45309" stroke-width="4"/><path d="M18 40l10-14h10l8 14M28 26l6 6M38 26h6" stroke="%23b45309" stroke-width="3" stroke-linecap="round"/></svg>`,
      label: 'Motor Vehicles & Bikes',
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#b45309',
    };
  }

  // 5. Cars & Automobiles (Audi, Maruti Suzuki, Hyundai, Tata Motors, Honda, Toyota, Mahindra)
  if (name.includes('audi') || name.includes('maruti') || name.includes('suzuki') || name.includes('hyundai') || name.includes('tata') || name.includes('toyota') || name.includes('honda') || name.includes('mahindra') || cat.includes('vehicle') || cat.includes('automotive') || cat.includes('car')) {
    return {
      type: 'car',
      emoji: '🚗',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23ffedd5"/><path d="M14 36l4-12h28l4 12v10H14z" fill="%23ea580c"/><circle cx="22" cy="46" r="4" fill="%23fff" stroke="%23ea580c" stroke-width="2"/><circle cx="42" cy="46" r="4" fill="%23fff" stroke="%23ea580c" stroke-width="2"/><path d="M20 28h24v6H20z" fill="%23fff"/></svg>`,
      label: 'Cars & Automotive',
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#ea580c',
    };
  }

  // 6. Hotel, Resort & Stay (OYO, Hotel, Resort)
  if (name.includes('oyo') || name.includes('hotel') || name.includes('resort') || name.includes('stay') || name.includes('room') || cat.includes('hotel') || cat.includes('travel')) {
    return {
      type: 'hotel',
      emoji: '🏨',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23fdf4ff"/><rect x="18" y="14" width="28" height="38" rx="2" fill="%23fff" stroke="%23c026d3" stroke-width="3"/><path d="M24 22h4v4h-4zm12 0h4v4h-4zm-12 8h4v4h-4zm12 0h4v4h-4zm-12 8h4v4h-4zm12 0h4v4h-4z" fill="%23c026d3"/><rect x="28" y="44" width="8" height="8" fill="%23c026d3"/></svg>`,
      label: 'Hotels & Rooms',
      bg: '#fdf4ff',
      border: '#f5d0fe',
      color: '#c026d3',
    };
  }

  // 7. Phones & Mobiles (Apple, Samsung, OnePlus, Vivo, Oppo, Realme, Xiaomi, Motorola)
  if (name.includes('apple') || name.includes('samsung') || name.includes('oneplus') || name.includes('vivo') || name.includes('oppo') || name.includes('realme') || name.includes('xiaomi') || name.includes('motorola') || cat.includes('mobile') || cat.includes('phone') || cat.includes('smartphone')) {
    return {
      type: 'phone',
      emoji: '📱',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23ecfdf5"/><rect x="20" y="12" width="24" height="40" rx="5" fill="%23fff" stroke="%23059669" stroke-width="3"/><circle cx="32" cy="46" r="2" fill="%23059669"/><rect x="28" y="16" width="8" height="2" rx="1" fill="%23059669"/></svg>`,
      label: 'Phones & Mobiles',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      color: '#059669',
    };
  }

  // 8. Electrical & Home Appliances (Havells, Voltas, Godrej, Whirlpool, LG, Sony)
  if (name.includes('havells') || name.includes('voltas') || name.includes('godrej') || name.includes('whirlpool') || name.includes('lg') || name.includes('sony') || cat.includes('appliance') || cat.includes('electronic') || cat.includes('tv')) {
    return {
      type: 'appliance',
      emoji: '⚡',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23fef9c3"/><path d="M34 14L20 34h12l-2 16 16-22H32z" fill="%23ca8a04"/><rect x="12" y="12" width="40" height="40" rx="8" fill="none" stroke="%23ca8a04" stroke-width="2.5"/></svg>`,
      label: 'Electrical & Home Appliances',
      bg: '#fefce8',
      border: '#fef08a',
      color: '#ca8a04',
    };
  }

  // 9. Banking & Finance (SBI, HDFC, ICICI, Bank)
  if (name.includes('sbi') || name.includes('bank') || name.includes('hdfc') || name.includes('icici') || name.includes('finance') || name.includes('paytm') || name.includes('phonepe') || cat.includes('bank') || cat.includes('finance')) {
    return {
      type: 'bank',
      emoji: '🏦',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23f0fdfa"/><path d="M32 14l18 10H14z" fill="%230d9488"/><rect x="18" y="26" width="5" height="18" fill="%230d9488"/><rect x="29.5" y="26" width="5" height="18" fill="%230d9488"/><rect x="41" y="26" width="5" height="18" fill="%230d9488"/><path d="M12 46h40v4H12z" fill="%230d9488"/></svg>`,
      label: 'Banking & Finance',
      bg: '#f0fdfa',
      border: '#99f6e4',
      color: '#0d9488',
    };
  }

  // 10. Delivery & E-Commerce (Flipkart, Amazon, Swiggy, Zomato, DTDC, BlueDart)
  if (name.includes('flipkart') || name.includes('amazon') || name.includes('swiggy') || name.includes('zomato') || name.includes('dtdc') || name.includes('courier') || name.includes('delivery') || cat.includes('courier') || cat.includes('delivery')) {
    return {
      type: 'delivery',
      emoji: '📦',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="%23fff7ed"/><path d="M32 16l16 8v16L32 48 16 40V24z" fill="%23ea580c"/><path d="M32 16v16m16-8L32 32m-16-8l16 8" stroke="%23fff" stroke-width="2.5"/></svg>`,
      label: 'Delivery & E-Commerce',
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#ea580c',
    };
  }

  // Default clean brand icon
  return {
    type: 'general',
    emoji: '🏢',
    svg: null,
    label: companyName,
    bg: '#f8fafc',
    border: '#e2e8f0',
    color: '#334155',
  };
}

export function getCompanyLogo(companyName = '') {
  // Always return null or matching clean brand to avoid broken remote hotlinking
  return null;
}
