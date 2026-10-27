import { BookOpen, ArrowRight } from 'lucide-react';
import { PaperReader, BoardCurator } from '../components/AnimatedIllustrations';

export default function ResearchRecovery({ hasEvidence, count, disabled, onRecover }) {
  const Actor = hasEvidence ? PaperReader : BoardCurator;
  return <section className="nv-recovery-pocket" aria-label="Continue without another AI call">
    <div className="nv-recovery-art" aria-hidden="true"><Actor size={115} /></div>
    <div><span className="nv-recovery-stamp">{hasEvidence ? 'SAVED FINDINGS' : 'CATALOGUE ONLY'}</span><h3>{hasEvidence ? 'There’s something on your desk.' : 'A different way forward.'}</h3>
      <p>{hasEvidence ? `${count} saved source excerpt${count === 1 ? '' : 's'}. Open the partial findings and the questions still unanswered.` : 'Browse saved scholarships and check recorded conditions. This will not confirm every condition in your question.'}</p>
      <button type="button" className="nv-button" disabled={disabled} aria-label={hasEvidence ? 'Use collected evidence — no AI call' : 'Search catalogue without AI'} onClick={onRecover}><BookOpen size={16} />{hasEvidence ? 'Use collected evidence' : 'Search catalogue without AI'}<ArrowRight size={16} /></button>
    </div>
  </section>;
}
