import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import { emailService } from "../services/emailService.js";

async function run() {
	console.log("==========================================================");
	console.log("=== UDAAN EMAIL UI & INBOX DELIVERY TESTER ===============");
	console.log("==========================================================\n");

	// 1. Get destination email from CLI argument or default
	const recipientEmail = process.argv[2] || process.env.TEST_EMAIL || process.env.SMTP_USER;
	const templateType = process.argv[3] || "INSTANT_MATCH";

	if (!recipientEmail) {
		console.error("Error: Please provide a recipient email address.");
		console.log("Usage: node backend/src/scripts/sendTestEmail.js <your-email@example.com> [templateType]");
		process.exit(1);
	}

	console.log(`[Config] SMTP Host: ${process.env.SMTP_HOST || "(not set)"}`);
	console.log(`[Config] SMTP User: ${process.env.SMTP_USER || "(not set)"}`);
	console.log(`[Config] Recipient: ${recipientEmail}`);
	console.log(`[Config] Template:  ${templateType}\n`);

	// 2. Prepare rich mock data for the template
	const mockData = {
		title: "Tata Trust Higher Education Grant 2026",
		scholarshipTitle: "Tata Trust Higher Education Grant 2026",
		amount: 250000,
		deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		link: "/scholarships/tata-trust-higher-education",
		evidence: {
			matchScore: 92,
			state: "All India",
			passedRulesSummary: [
				"Family annual income ≤ ₹6,00,000",
				"Enrolled in accredited Graduate / Post-Graduate degree",
				"Minimum 60% aggregate in preceding examination",
				"Indian Citizen with verified domicile",
			],
		},
		data: {
			topScholarships: [
				{
					title: "UGC Post-Graduate Indira Gandhi Scholarship",
					organization: "University Grants Commission",
					amount: 37200,
					deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
				},
				{
					title: "AICTE Pragati Scholarship for Girls",
					organization: "All India Council for Technical Education",
					amount: 50000,
					deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
				},
				{
					title: "Santoor Women's Scholarship Programme",
					organization: "Wipro Cares Foundation",
					amount: 24000,
					deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				},
			],
		},
	};

	// 3. Render HTML locally so user can also view it offline in browser
	const rendered = emailService.renderTemplate(templateType, mockData);
	const previewHtmlPath = path.resolve(__dirname, "../../email_preview.html");
	fs.writeFileSync(previewHtmlPath, rendered.html, "utf8");
	console.log(`✓ Offline HTML preview generated:`);
	console.log(`  File: ${previewHtmlPath}`);
	console.log(`  (You can double-click and open this file in Chrome/Edge to see the email design!)\n`);

	// 4. Verify SMTP Connection
	console.log("Verifying SMTP connection with email server...");
	const isConnected = await emailService.verifyConnection();

	if (!isConnected) {
		console.warn("\n⚠️  SMTP could not connect. Check your Gmail App Password or network connection in backend/.env.");
		console.log("You can still inspect the generated email_preview.html in your browser directly!");
		return;
	}

	// 5. Send Real Email to Inbox
	console.log(`\nDispatching real test email to <${recipientEmail}>...`);
	const result = await emailService.sendEmail({
		to: recipientEmail,
		type: templateType,
		data: mockData,
		notificationId: "test-notification-001",
		userId: "test-user-001",
	});

	if (result.success) {
		console.log("\n==========================================================");
		console.log(`🎉 SUCCESS! Email delivered.`);
		console.log(`   Message ID: ${result.messageId}`);
		console.log(`   Check your inbox (and Spam/Updates folder) at: ${recipientEmail}`);
		console.log("==========================================================");
	} else {
		console.error(`\n❌ Failed to deliver email:`, result.error);
	}
}

run()
	.catch((err) => console.error("Script error:", err))
	.finally(() => process.exit(0));