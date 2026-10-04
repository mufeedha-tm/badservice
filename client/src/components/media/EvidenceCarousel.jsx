import MediaCarousel from './MediaCarousel.jsx';
import { getComplaintMedia } from '../../utils/complaintMedia.js';
import { getShowcaseImage } from '../../utils/showcaseImages.js';

/**
 * A consistent three-slide evidence rail used across product, company and category views.
 * Real customer evidence is always preferred. Missing evidence is clearly labelled rather
 * than fabricated, so the UI never presents stock media as customer proof.
 */
export default function EvidenceCarousel({ complaint, category, productName = 'Product', compact = false, autoPlay = false }) {
  const source = complaint || {};
  const real = getComplaintMedia(source);
  const byKind = new Map(real.map((item) => [item.kind, item]));
  const fallbackImage = getShowcaseImage(category);

  const items = [
    byKind.get('product') || {
      id: `${source.id || productName}-product-fallback`,
      type: 'image',
      url: fallbackImage,
      label: `${productName} showcase`,
      kind: 'showcase',
    },
    byKind.get('video') || {
      id: `${source.id || productName}-video-missing`,
      type: 'placeholder',
      label: 'Product video',
      placeholderTitle: 'Product video',
      placeholderText: 'Customer video will appear here after it is submitted and verified.',
      kind: 'video-missing',
    },
    byKind.get('bill') || {
      id: `${source.id || productName}-bill-missing`,
      type: 'placeholder',
      label: 'Purchase bill',
      placeholderTitle: 'Purchase proof',
      placeholderText: 'The original bill or purchase proof will appear here when submitted.',
      kind: 'bill-missing',
    },
  ];

  return <MediaCarousel items={items} alt={`${productName} evidence`} autoPlay={autoPlay} compact={compact} />;
}
