export const faqs = [
	{
		question: "How does Udaan match me with scholarships?",
		answer:
			"Udaan uses an automated eligibility engine. When you fill out your profile details (state, category, family income, course, CGPA), our system cross-checks them against our database to label matching opportunities as Eligible, Partially Eligible, or Not Eligible.",
	},
	{
		question: "Can I search using conversational language?",
		answer:
			"Yes! Thanks to our integrated NLP search layer, you don't have to rely solely on rigid drop-down filters. You can type queries like 'I am a 3rd year BTech student from Kanpur with an income under 5 Lakhs', and our platform will extract your criteria to find matching results.",
	},
	{
		question: "How does the smart document upload work?",
		answer:
			"Instead of manually filling out tedious forms, you can upload your crucial documents like your income certificate, marksheets, or caste certificate. Our built-in OCR system securely processes the document text to auto-fill major sections of your profile.",
	},
	{
		question: "How accurate and up-to-date is the scholarship data?",
		answer:
			"We run an automated data ingestion and web-crawling pipeline that checks trusted sources—like the National Scholarship Portal, state portals, and verified NGO foundations—on a scheduled weekly basis to update deadlines, remove expired listings, and capture new opportunities.",
	},
	{
		question: "What does the percentage match mean next to a scholarship?",
		answer:
			"After the eligibility engine filters your options, our Machine Learning recommendation system ranks them. The match percentage indicates structural fit based on criteria strength, maximum award amount, popularity, and profile similarity.",
	},
	{
		question: "Are the GenAI responses reliable?",
		answer:
			"Our GenAI assistant utilizes a Retrieval-Augmented Generation (RAG) architecture. It only formulates responses using verified, structured data directly from our vetted PostgreSQL database, ensuring it doesn't invent hallucinated internet details.",
	},
	{
		question: "Does Udaan charge any processing or application fees?",
		answer:
			"No. Finding, matching, and exploring official application sources through Udaan is completely free. We never charge students to access intelligence metrics or scholarship information.",
	},
	{
		question: "Can I track applications or save scholarships for later?",
		answer:
			"Yes. By creating an account, you can bookmark specific scholarships, set up automated tracking statuses, and receive email alert notifications as your saved deadlines approach.",
	},
];

// Helper splits for balanced two-column UI rendering
export const faqLeft = faqs.filter((_, i) => i % 2 === 0);
export const faqRight = faqs.filter((_, i) => i % 2 !== 0);
