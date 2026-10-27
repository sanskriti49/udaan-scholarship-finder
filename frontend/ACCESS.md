# Feature access

Public (no account): homepage; scholarship search, filters, details, stored source
evidence, calendar links and official application links; eligibility checker;
document scanner; document checklist; Trust Shield; resources, application and
writing guides; help and FAQs. The AI Navigator research desk (`/navigator`) is
publicly viewable to explore its capabilities. Legacy public aliases remain available.

Account required:
- AI Navigator research investigations: starting an investigation, advancing through
  the sequential tool execution loop (`/navigator/investigation`), interactive
  clarifications, checkpoint recovery, and generating verified research plans
  (`/navigator/plan`). Research notes and investigation states are retained privately
  for up to 7 days with atomic quota enforcement and execution lease fencing.
- Saved scholarships and application tracking.
- Notification inbox, alert preferences, and test emails.
- Account settings and data export.
Guest entry points explain sign-in and preserve the chosen destination. Backend
bookmark, profile, notification, and navigator run endpoints remain protected.

Navigation layout:
The desktop navbar prominently features primary links for Home, Scholarships,
Eligibility, and AI Navigator (direct top-level link badged as an AI Agent), alongside
a dedicated Tools disclosure for client utilities and resources (Document scanner,
Document checklist, Trust Shield, and Resources) that require no sign-in.
Mobile navigation presents primary destinations at the top, lists public tools, and
labels account-only features for guests. The footer includes every public tool, guide,
and catalogue category (including AI Navigator) for all visitors.

Privacy, evidence and tool boundaries:
- AI Navigator research runs under strict privacy boundaries: profile inputs are
  isolated in a private per-investigation context, never written to saved account
  profiles, and never passed as raw values to model prompts. Missing inputs remain
  unknown. Citations require exact offset, quotation, snapshot ID, and SHA-256 hash
  binding. Official source checks (`checkOfficialSource`) perform bounded byte-level
  comparisons on registered domains without adopting unverified claims.
- Daily model call allowances are enforced atomically in MongoDB (`navigator_quotas`)
  with automatic cooldown handling on provider rate limits (429) and no automatic
  paid tier upgrades.
- Document checklist ticks stay in the browser for everyone. Scanner OCR and document
  auditing run entirely client-side; reviewed fields are sent only when the visitor
  explicitly bridges to the eligibility checker.
- Eligibility answers are evaluated deterministically; signed-in checks update the
  user's saved profile, while guest checks do not create profiles.
- Settings profile edits currently remain session drafts and password updates are
  unavailable. Support forms copy drafts and explain nothing is sent to a delivery API.

Validation: `node --test test/access.test.mjs`, focused ESLint, production build,
and browser checks for public routes, private redirects, auth form switching,
menu keyboard behavior, guest/signed-in footer coverage and mobile layout.
