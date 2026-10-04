import EvidenceCarousel from '../media/EvidenceCarousel.jsx';

export default function ComplaintMediaGallery({ complaint, autoPlay = false }) {
  return (
    <div className="complaint-media-gallery complaint-media-gallery--evidence">
      <EvidenceCarousel
        complaint={complaint}
        category={complaint?.category}
        productName={complaint?.productName || complaint?.model || complaint?.company || 'Product'}
        autoPlay={autoPlay}
      />
      <p className="complaint-media-gallery__caption">Evidence rail: product photo · product video · purchase proof. Missing customer evidence is clearly labelled.</p>
    </div>
  );
}
