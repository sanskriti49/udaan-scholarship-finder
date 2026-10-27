import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleHelp } from 'lucide-react';
import { researchSummary } from './researchSummary.js';
import './research-summary.css';

export default function ResearchTakeaway({ plan }) {
  const summary = researchSummary(plan);
  if (plan.intent?.status === 'needs_clarification') return null;
  return <section className="nv-takeaway" aria-label="Your research takeaway">
    <span className="nv-eyebrow">THE USEFUL PART</span>
    <h2>{summary.heading}</h2>
    <p>{summary.message}</p>
    <ul className="nv-takeaway-counts">
      {summary.counts.promising > 0 && <li><Check size={18} aria-hidden="true" />{summary.counts.promising} with supporting findings</li>}
      {summary.counts.unconfirmed > 0 && <li><CircleHelp size={18} aria-hidden="true" />{summary.counts.unconfirmed} still unconfirmed</li>}
      {summary.counts.concern + summary.counts.excluded > 0 && <li>{summary.counts.concern + summary.counts.excluded} with eligibility concerns or exclusions</li>}
    </ul>
    {summary.nextField && <p className="nv-takeaway-next"><strong>A useful next detail:</strong> {summary.nextField}. It is missing from the information used for some potentially relevant options. Leaving it blank does not mean you fail that condition.</p>}
    {!summary.entries.length && <Link className="nv-text-link" to="/scholarships">Browse the scholarship catalogue <ArrowRight size={15} /></Link>}
  </section>;
}
