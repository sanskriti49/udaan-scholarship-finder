import { ArrowDownRight, PenLine } from 'lucide-react';
import NavigatorIllustration from './NavigatorIllustration';

export default function QuestionScene({ goal = '', mode = null, onCompose }) {
  return <div className="nv-question-scene nv-compass-scene" data-mode={mode ?? 'open'}>
    <NavigatorIllustration />
    {goal.trim() && <div className="nv-compass-draft">
      <span className="nv-paper-tab"><PenLine size={14} /> YOUR DRAFT</span>
      <p className="nv-paper-question">{goal}</p>
      <button className="nv-text-link" type="button" onClick={onCompose}>Edit your question <ArrowDownRight size={17} /></button>
    </div>}
  </div>;
}
