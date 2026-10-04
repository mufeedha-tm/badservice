import MediaCarousel from '../media/MediaCarousel.jsx';
import { getComplaintMedia } from '../../utils/complaintMedia.js';

export default function ComplaintMediaGallery({ complaint, autoPlay = false }) {
  const items = getComplaintMedia(complaint);
  return (
    <div className="complaint-media-gallery">
      <MediaCarousel items={items} alt={complaint?.title || 'Complaint evidence'} autoPlay={autoPlay} />
      {items.length > 0 && (
        <p className="complaint-media-gallery__caption">
          {items.length} evidence file{items.length === 1 ? '' : 's'} · photos and video from the original complaint
        </p>
      )}
    </div>
  );
}
