import MediaCarousel from './MediaCarousel.jsx';
import { getComplaintMedia } from '../../utils/complaintMedia.js';

/**
 * A consistent two-slide evidence rail used across complaints, product cards,
 * company, and category views.
 * Slide 1: Actual uploaded product/service photo
 * Slide 2: Actual uploaded product/service video
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

  let items = [];
  if (real.length > 0) {
    items = real;
  } else {
    items = [
      {
        id: `${source.id || productName}-product-missing`,
        type: 'placeholder',
        label: photoLabel,
        placeholderTitle: 'Evidence unavailable',
        placeholderText: `${photoLabel} was not provided with this record.`,
        kind: 'product-missing',
      },
      {
        id: `${source.id || productName}-video-missing`,
        type: 'placeholder',
        label: videoLabel,
        placeholderTitle: videoLabel,
        placeholderText: 'Customer video will appear here after it is submitted and verified.',
        kind: 'video-missing',
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
