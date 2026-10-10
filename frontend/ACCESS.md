# Feature access

Public (no account): homepage; scholarship search, filters, details, evidence,
calendar links and official application links; eligibility checker; document
scanner; document checklist; Trust Shield; resources, application and writing
guides; help and FAQs. Legacy public aliases remain available.

Account required: saved scholarships and application tracking; notification
inbox; alert preferences and test emails; account settings and export. Guest
entry points explain sign-in and preserve the chosen destination. Backend
bookmark, profile and notification endpoints remain protected.

The desktop navbar has a shared Public tools disclosure. Mobile navigation
lists every public tool. The footer includes every public tool and guide for
both guests and signed-in visitors, and labels account-only features for guests.

Document checklist ticks stay in the browser for everyone. This is not cloud
document storage or verification. Scanner processing remains inside the browser;
reviewed fields are sent only when the visitor chooses the eligibility bridge.
Eligibility answers are submitted to the evaluation API; signed-in checks also
update the user's saved eligibility profile. Guest checks do not create profiles.

Settings profile edits currently remain session drafts and password updates
are unavailable. Support forms have no delivery API: they now copy drafts and
explicitly explain that nothing is sent, instead of showing false send success.

Validation: `node --test test/access.test.mjs`, focused ESLint, production build,
and browser checks for public routes, private redirects, auth form switching,
menu keyboard behavior, guest/signed-in footer coverage and mobile layout.
