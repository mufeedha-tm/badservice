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
  autoPlay = false,
}) {
  const source = complaint || {};
  const isService = source.type === 'Service';
  const real = getComplaintMedia(source);
  const byKind = new Map(real.map((item) => [item.kind, item]));

  const photoLabel = isService ? 'Service photo' : 'Product photo';
  const videoLabel = isService ? 'Service video' : 'Product video';

  const items = [
    byKind.get('product') || {
      id: `${source.id || productName}-product-missing`,
      type: 'placeholder',
      label: photoLabel,
      placeholderTitle: 'Evidence unavailable',
      placeholderText: `${photoLabel} was not provided with this record.`,
      kind: 'product-missing',
    },
    byKind.get('video') || {
      id: `${source.id || productName}-video-missing`,
      type: 'placeholder',
      label: videoLabel,
      placeholderTitle: videoLabel,
      placeholderText: 'Customer video will appear here after it is submitted and verified.',
      kind: 'video-missing',
    },
  ];

  return (
    <MediaCarousel
      items={items}
      alt={`${productName} evidence`}
      autoPlay={autoPlay}
      compact={compact}
    />
  );
}
