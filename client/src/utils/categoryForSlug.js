const knownSubcategories = {
  'two-wheeler': { category: 'Vehicles & Automotive', subcategory: 'Two Wheeler', label: 'Two Wheeler' },
  'cars': { category: 'Vehicles & Automotive', subcategory: 'Cars', label: 'Cars' },
  'service-centers': { category: 'Vehicles & Automotive', subcategory: 'Service Centers', label: 'Service Centers' },
  'laptops': { category: 'Computers', subcategory: 'Laptops', label: 'Laptops' },
  'hospitals': { category: 'Hospital & Healthcare', subcategory: 'Healthcare', label: 'Hospitals' },
  'pharmacies': { category: 'Hospital & Healthcare', subcategory: 'Healthcare', label: 'Pharmacies' },
  'hotels': { category: 'Hotel & Travel', subcategory: 'Hotels', label: 'Hotels' },
  'restaurants': { category: 'Restaurants & Food', subcategory: null, label: 'Restaurants' },
  'flights': { category: 'Flights & Trains', subcategory: 'Flights', label: 'Flights' },
  'trains-buses': { category: 'Flights & Trains', subcategory: null, label: 'Trains & Buses' },
  'banks': { category: 'Banking', subcategory: null, label: 'Banks' },
};

export function getCategoryFilterForSlug(slug, navigation) {
  if (knownSubcategories[slug]) {
    const info = knownSubcategories[slug];
    return {
      categories: [info.category],
      subcategory: info.subcategory,
      title: info.label,
    };
  }

  const path = `/categories/${slug}`;
  const secondaryItem = navigation?.secondaryNavigationItems?.find((item) => item.to === path);
  if (secondaryItem?.category) {
    return { categories: [secondaryItem.category], subcategory: null, title: secondaryItem.label || secondaryItem.category };
  }

  for (const column of navigation?.megaMenuColumns || []) {
    for (const section of column.sections) {
      for (const item of section.items || []) {
        if ((item.to || `/categories/${item.id}`) === path && item.category) {
          return {
            categories: [item.category],
            subcategory: item.id !== slug && item.label ? item.label : null,
            title: item.label || item.category,
          };
        }
      }

      for (const group of section.groups || []) {
        if (`/categories/${group.id}` === path) {
          const cats = group.categories || (group.category ? [group.category] : []);
          return { categories: cats, subcategory: null, title: group.title };
        }
        for (const item of group.items) {
          if (`/categories/${item.id}` === path && item.category) {
            return {
              categories: [item.category],
              subcategory: item.label || null,
              title: item.label || item.category,
            };
          }
        }
      }
    }
  }

  return { categories: [], subcategory: null, title: slug };
}

export function getCategoriesForSlug(slug, navigation) {
  const filter = getCategoryFilterForSlug(slug, navigation);
  return filter.categories;
}