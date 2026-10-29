import { ArrowUpRight, Check } from 'lucide-react';
import { CoinHugger, PaperReader, BoardCurator } from '../components/AnimatedIllustrations';
import { PROMPTS } from './contracts';

const starters = [
  { title: 'Find a way to fund it.', note: 'Fees, hostel costs, the next year.', Actor: CoinHugger, tag: 'FIND FUNDING' },
  { title: 'Untangle the fine print.', note: 'Who can apply? What needs checking?', Actor: PaperReader, tag: 'CHECK A CONDITION' },
  { title: 'Work out my next move.', note: 'A shortlist and the questions still open.', Actor: BoardCurator, tag: 'MAKE A PLAN' },
];

// Editable examples, never a classifier or an inferred student profile.
export default function QuestionLaunchpad({ goal, onChoose }) {
  return <section className="nv-launchpad" aria-label="Choose a starting point">
    <div className="nv-launchpad-heading"><span className="nv-eyebrow">WHAT BRINGS YOU HERE?</span><p>Pick a starting point. Make it yours.</p></div>
    <div className="nv-mission-grid">{starters.map(({ title, note, Actor, tag }, index) => {
      const selected = goal === PROMPTS[index].goal;
      return <button type="button" key={tag} className={`nv-mission nv-mission-${index}`} aria-label={PROMPTS[index].label} aria-pressed={selected} onClick={() => onChoose(PROMPTS[index], index)}>
        <span className="nv-mission-art" aria-hidden="true"><Actor size={98} /></span>
        <span className="nv-mission-copy"><small>{tag}</small><strong>{title}</strong><span>{note}</span></span>
        <span className="nv-mission-arrow" aria-hidden="true">{selected ? <Check size={20} /> : <ArrowUpRight size={20} />}</span>
      </button>;
    })}</div>
  </section>;
}
