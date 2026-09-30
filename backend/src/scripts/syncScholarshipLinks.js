import dotenv from "dotenv";
dotenv.config();
import connectDB from "../config/db.js";
import Scholarship from "../models/Scholarship.js";

async function syncLinks() {
	await connectDB();
	console.log("Synchronizing scholarship source URLs and official links in MongoDB...");

	const published = await Scholarship.find({ "publication.state": "published" });
	console.log(`Found ${published.length} published scholarships.`);

	let updatedCount = 0;
	for (const doc of published) {
		let modified = false;

		// 1. If guidelinesUrl is present, sourceUrl should point to the exact guidelines PDF
		const guidelinePdf = doc.officialLinks?.guidelinesUrl;
		if (guidelinePdf && doc.sourceUrl !== guidelinePdf) {
			doc.sourceUrl = guidelinePdf;
			modified = true;
		}

		// 2. Ensure officialLinks.applyUrl is set
		if (doc.applicationLink && doc.officialLinks && !doc.officialLinks.applyUrl) {
			doc.officialLinks.applyUrl = doc.applicationLink;
			modified = true;
		}

		// 3. For provenanceQuotes, ensure each quote has a valid sourceUrl
		if (Array.isArray(doc.provenanceQuotes)) {
			for (const q of doc.provenanceQuotes) {
				if (!q.sourceUrl) {
					q.sourceUrl = doc.sourceUrl || doc.officialLinks?.guidelinesUrl || "https://scholarships.gov.in/All-Scholarships";
					modified = true;
				}
			}
		}

		if (modified) {
			await doc.save();
			updatedCount += 1;
		}
	}

	console.log(`Synchronization complete. Updated ${updatedCount} scholarship records.`);
	process.exit(0);
}

syncLinks().catch((err) => {
	console.error("Sync error:", err);
	process.exit(1);
});
