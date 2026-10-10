// Shared by the homepage and Help & Support. Describe shipped behavior, not plans.
export const faqs = [
  {
    id: 'public-access', category: 'Getting started',
    question: 'Do I need an account to get started?',
    answer: 'No. You can browse scholarships, check eligibility, review documents with the scanner, use the document checklist and Trust Shield, and read the guides without signing in. An account is needed to save scholarships and manage your notifications and alert preferences.',
    path: '/scholarships', linkLabel: 'Explore scholarships',
  },
  {
    id: 'apply', category: 'Getting started',
    question: 'Do I apply through Udaan?',
    answer: 'Udaan helps you find opportunities and prepare. Applications are submitted through the scholarship provider’s application link or official portal. Opening a link or saving a scholarship in Udaan does not submit an application. Check the provider’s current instructions before applying.',
    path: '/how-to-apply', linkLabel: 'Read the application guide',
  },
  {
    id: 'freshness', category: 'Getting started',
    question: 'Can I rely on every deadline and amount shown here?',
    answer: 'Use the listing as a starting point. Udaan collects scholarship information and shows source evidence where available, but updates can be delayed and some details may be missing. Confirm the current deadline, award amount and requirements on the provider’s official notice or portal before you apply.',
    path: '/scholarships?hasChanges=true', linkLabel: 'See recent listing updates',
  },
  {
    id: 'eligibility', category: 'Checks & documents',
    question: 'Does an “Eligible” result guarantee a scholarship?',
    answer: 'No. The checker compares the details you enter with the criteria recorded for a scheme and shows the rule breakdown. Missing details or incomplete scheme information can limit the result. It is a screening aid, not an official decision or a prediction of selection. The provider makes the final decision.',
    path: '/eligibility', linkLabel: 'Open the eligibility checker',
  },
  {
    id: 'percentage', category: 'Checks & documents',
    question: 'What does “% of rules met” mean?',
    answer: 'It summarises how many of the evaluated criteria your entered details satisfy. It is a rule-based calculation, not an ML recommendation or your chance of receiving an award. Read the individual passed, failed and missing-information checks; the percentage alone does not establish eligibility.',
    path: '/eligibility', linkLabel: 'Review your criteria',
  },
  {
    id: 'scanner', category: 'Checks & documents',
    question: 'What does the document scanner actually check?',
    answer: 'It reads text from English PDF, PNG or JPG files on your device so you can review and edit extracted details and inspect date or format observations. Files can be up to 10 MB, with up to 5 pages for PDFs. You choose which supported fields to pass to the eligibility checker. Files are not uploaded or stored by the scanner. A scan cannot prove authenticity, and unreadable text does not mean a document is invalid.',
    path: '/scanner', linkLabel: 'Try the document scanner',
  },
  {
    id: 'checklist', category: 'Checks & documents',
    question: 'Does the checklist store or verify my documents?',
    answer: 'No. It stores your checklist statuses in this browser, not copies of your documents. Marking a paper ready is your own progress note, not verification or confirmation that a provider will accept it. It does not sync across devices, and clearing browser data can remove your progress. Check the scheme’s official document requirements.',
    path: '/documents', linkLabel: 'Open your checklist',
  },
  {
    id: 'saved', category: 'Saved & alerts',
    question: 'Can I save scholarships and track my application?',
    answer: 'Sign in to bookmark scholarships and return to your shortlist. Saved listings help you revisit deadlines and application links. Udaan does not automatically track whether you submitted an application or whether it was accepted. Check your application status with the provider’s portal.',
    path: '/saved', linkLabel: 'View saved scholarships',
  },
  {
    id: 'alerts', category: 'Saved & alerts',
    question: 'Will I always receive a deadline reminder?',
    answer: 'You can manage alert preferences when signed in. Reminders depend on the scholarship’s recorded deadline, your preferences and the notification service; email delivery also depends on the email service. Delivery is not guaranteed. Keep your own deadline reminders and check the official portal regularly.',
    path: '/settings?tab=notifications', linkLabel: 'Manage alert preferences',
  },
];
