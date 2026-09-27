import ComplaintCard from './ComplaintCard.jsx';

export default function ComplaintGrid({ complaints }) {
  return (
    <section className="complaint-grid" aria-label="Complaints">
      {complaints.map((complaint) => (
        <ComplaintCard complaint={complaint} key={complaint.id} />
      ))}
    </section>
  );
}