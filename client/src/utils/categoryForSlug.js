export function getCategoriesForSlug(slug, navigation) {
  const path = `/categories/${slug}`;
  const secondaryItem = navigation?.secondaryNavigationItems?.find((item) => item.to === path);
  if (secondaryItem?.category) return [secondaryItem.category];

  for (const column of navigation?.megaMenuColumns || []) {
    for (const section of column.sections) {
      for (const item of section.items || []) {
        if ((item.to || `/categories/${item.id}`) === path && item.category) {
          return [item.category];
        }
      }

      for (const group of section.groups || []) {
        if (`/categories/${group.id}` === path) {
          return group.categories || (group.category ? [group.category] : []);
        }
        for (const item of group.items) {
          if (`/categories/${item.id}` === path && item.category) return [item.category];
        }
      }
    }
  }

  return [];
}