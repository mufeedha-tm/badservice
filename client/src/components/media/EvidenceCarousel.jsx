import MediaCarousel from './MediaCarousel.jsx';
import { getComplaintMedia } from '../../utils/complaintMedia.js';
import { getShowcaseImage } from '../../utils/showcaseImages.js';

/**
 * A consistent two-slide evidence rail used across complaints, product cards,
 * company, and category views.
 * Slide 1: Actual uploaded product/service photo (or showcase photo fallback)
 * Slide 2: Actual uploaded product/service video (or video evidence)
 * Bill evidence is private and is available only to admins.
 */
export default function EvidenceCarousel({
  complaint,
  category,
  productName = 'Product',
  compact = false,
  autoPlay = true,
  includeBill = false,
}) {
  const source = complaint || {};
  const isService = source.type === 'Service';
  const real = getComplaintMedia(source, includeBill);

  const photoLabel = isService ? 'Service photo' : 'Product photo';
  const videoLabel = isService ? 'Service video' : 'Product video';
  const catName = category || source.category || 'Computers';

  let items = [];
  if (real.length > 0) {
    // If has video but no image, prepend the showcase image so user sees photo first then auto-plays video
    const hasImage = real.some((it) => it.type === 'image');
    if (!hasImage) {
      items = [
        {
          id: `${source.id || productName}-showcase-img`,
          kind: 'product',
          type: 'image',
          url: getShowcaseImage(catName),
          label: `${catName} reference photo`,
        },
        ...real,
      ];
    } else {
      items = real;
    }
  } else {
    items = [
      {
        id: `${source.id || productName}-product-showcase`,
        kind: 'product',
        type: 'image',
        url: getShowcaseImage(catName),
        label: `${catName} photo`,
      },
    ];
  }

  return (
    <MediaCarousel
      items={items}
      alt={`${productName} evidence`}
      autoPlay={autoPlay}
      compact={compact}
    />
  );
}
