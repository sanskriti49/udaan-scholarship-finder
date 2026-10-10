import { useSearchParams } from 'react-router-dom';
import { ACCOUNT_FEATURES } from '../config/navigation';
import { safeReturnPath } from '../utils/authNavigation';

export default function AuthReturnNote() {
  const [params] = useSearchParams();
  const target = safeReturnPath(params.get('redirect'));
  const feature = ACCOUNT_FEATURES.find(item => target.startsWith(item.path));
  if (!feature) return null;
  return <p className="mb-5 rounded-md border border-emerald-950/20 bg-yellow-100 px-4 py-3 text-xs leading-relaxed text-emerald-950">Sign in for <strong>{feature.label.toLowerCase()}</strong>. You’ll return there afterwards. Browsing, eligibility checks and document tools are available without an account.</p>;
}
