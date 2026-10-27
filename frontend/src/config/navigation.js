// Public tools work without an account. Personal collections and preferences need one.
export const PUBLIC_TOOLS = [
  { label: 'Document scanner', path: '/scanner', description: 'Review a document inside your browser.' },
  { label: 'Document checklist', path: '/documents', description: 'Keep track of the papers you have ready.' },
  { label: 'Trust Shield', path: '/trust-shield', description: 'Check a scholarship link or message.' },
  { label: 'Resources', path: '/resources', description: 'Guides, preparation checklists, and FAQs.' },
];
export const AGENT_FEATURE = {
  label: 'AI Navigator',
  path: '/navigator',
  badge: 'Agent',
  description: 'Autonomous research agent with source citations, guideline checks, and eligibility matching.',
};
export const PUBLIC_GUIDES = [
  { label: 'Resources', path: '/resources' },
  { label: 'How to apply', path: '/how-to-apply' },
  { label: 'Writing guides', path: '/application-guide' },
  { label: 'Help & support', path: '/support' },
];
export const ACCOUNT_FEATURES = [
  { label: 'Saved scholarships', path: '/saved', description: 'Keep your shortlist in your account.' },
  { label: 'Alert preferences', path: '/settings?tab=notifications', description: 'Choose your scholarship reminders.' },
  { label: 'Account settings', path: '/settings', description: 'Manage your account and preferences.' },
];
