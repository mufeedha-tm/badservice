import MediaCarousel from './MediaCarousel.jsx';
import { getComplaintMedia } from '../../utils/complaintMedia.js';

/**
 * A consistent three-slide evidence rail used across complaints, product cards,
 * company, and category views.
 * Slide 1: Actual uploaded product/service photo
 * Slide 2: Actual uploaded product/service video
 * Slide 3: Actual uploaded bill/purchase proof
 * Missing evidence displays a neutral "Evidence unavailable" placeholder.
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
  const billLabel = isService ? 'Purchase proof' : 'Purchase proof';

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
    byKind.get('bill') || {
      id: `${source.id || productName}-bill-missing`,
      type: 'placeholder',
      label: billLabel,
      placeholderTitle: 'Purchase proof',
      placeholderText: 'The original bill or purchase proof will appear here when submitted.',
      kind: 'bill-missing',
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
