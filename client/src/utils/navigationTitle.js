export function getNavigationTitle(slug, navigation) {
  const categoryPath = `/categories/${slug}`;
  const secondaryItem = navigation?.secondaryNavigationItems?.find((item) => item.to === categoryPath);
  if (secondaryItem) return secondaryItem.label;

  for (const column of navigation?.megaMenuColumns || []) {
    for (const section of column.sections) {
      for (const item of section.items || []) {
        if (item.id === slug) return item.label;
      }

      for (const group of section.groups || []) {
        if (group.id === slug) return group.title;
        const item = group.items.find((entry) => entry.id === slug);
        if (item) return item.label;
      }
    }
  }

  return slug.split('-').map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(' ');
}