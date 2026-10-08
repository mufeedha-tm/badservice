import { Link } from 'react-router-dom';

const termsSections = [
  {
    heading: '1. Nature of Platform',
    content: (
      <p>
        BadService is an independent <strong>online public grievance and review sharing platform.</strong>{' '}
        We act only as an <strong>Intermediary</strong> under Section 2(1)(w) of the Information Technology
        Act, 2000. We do not provide legal advice, consumer court services, or dispute resolution. We only
        provide a digital space for users to share their experiences.
      </p>
    ),
  },
  {
    heading: '2. Sole Responsibility of User',
    content: (
      <ul>
        <li>Any complaint, review, comment, photo, or bill uploaded by a user is the <strong>sole responsibility of that user.</strong></li>
        <li>The user declares that the complaint is <strong>true, genuine, and based on their personal experience.</strong></li>
        <li>The user shall not post false, fake, misleading, defamatory, abusive, threatening, or obscene content.</li>
        <li>Posting defamatory content may attract legal action under <strong>Section 499 &amp; 500 IPC and Section 66D of IT Act</strong> against the user who posted it. BadService will not be liable.</li>
        <li>The user is responsible for the accuracy of company name, product name, and incident details.</li>
      </ul>
    ),
  },
  {
    heading: '3. BadService is Only a Support Platform',
    content: (
      <ul>
        <li>BadService is <strong>only an online support platform.</strong> We do not guarantee resolution of any complaint.</li>
        <li>We do not verify the truthfulness of complaints. We do not contact companies on behalf of users.</li>
        <li>Complaints posted here <strong>do not have any legal validity</strong> and cannot be used as evidence in court unless independently verified.</li>
        <li>We are not a consumer forum, not a law firm, and not associated with any government authority.</li>
      </ul>
    ),
  },
  {
    heading: '4. Things We Do Not Know',
    content: (
      <p>
        We do not have personal knowledge of transactions between users and companies. Bills, warranties,
        service records, and conversations are submitted by users and are not verified by us. Disputes must
        be resolved directly between the user and the concerned company/service provider.
      </p>
    ),
  },
  {
    heading: '5. Content Moderation and Removal',
    content: (
      <ul>
        <li>We reserve the right to <strong>edit, hide, or delete any complaint</strong> without prior notice if it violates our policy, contains personal phone numbers, abusive language, or appears to be fake.</li>
        <li>On receiving a valid request from a company with proof, we may remove or ask for proof from the user.</li>
        <li>We reserve the right to block or terminate any user account for misuse.</li>
      </ul>
    ),
  },
  {
    heading: '6. No Liability of BadService',
    content: (
      <p>
        BadService, its owner, administrators, and employees <strong>shall not be held liable</strong> for
        any complaint posted by users. If any company suffers loss or defamation due to a user&apos;s post,
        the legal remedy lies only against the user who posted it, not against BadService. By using this
        platform, you agree to indemnify and hold harmless BadService from any legal claims, damages, or costs.
      </p>
    ),
  },
  {
    heading: '7. Privacy Policy',
    content: (
      <ul>
        <li>Your phone number, email, and address are kept private and not shown publicly.</li>
        <li>Only your name, place, and complaint details are public.</li>
        <li>We do not sell user data to third parties.</li>
      </ul>
    ),
  },
  {
    heading: '8. User Declaration',
    content: (
      <p>
        By registering and posting a complaint, you declare:{' '}
        <em>
          &quot;I confirm that the information provided by me is true and correct to the best of my
          knowledge. I understand that I am solely responsible for this complaint and BadService is only
          a platform to share it. I will bear all legal consequences if the complaint is found false.&quot;
        </em>
      </p>
    ),
  },
  {
    heading: '9. Acceptance of Terms',
    content: (
      <p>
        By clicking &quot;I Agree&quot; and registering, you confirm that you have{' '}
        <strong>read, understood, and accepted</strong> all Terms &amp; Conditions. If you do not agree,
        please do not use this website.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="terms-document">
      <header className="terms-document__header">
        <h1>Terms &amp; Conditions - BadService</h1>
        <p>Effective Date: September 27, 2026 | www.badservice.in</p>
      </header>

      {termsSections.map(({ heading, content }) => (
        <section className="terms-document__section" key={heading}>
          <h2>{heading}</h2>
          {content}
        </section>
      ))}

      <aside className="terms-document__disclaimer">
        <strong>Disclaimer:</strong> This website is operated from Kanhangad, Kasaragod, Kerala, India.
        Any disputes are subject to jurisdiction of courts in Kasaragod.
      </aside>

      <label className="terms-document__accept">
        <input type="checkbox" />
        <span>I have read and agreed to all Terms &amp; Conditions</span>
      </label>

      <Link className="terms-document__back" to="/file-complaint">
        Back to File Complaint
      </Link>
    </main>
  );
}
