import crypto from "crypto";

export class Deduplicator {
	/**
	 * Compute standard SHA256 checksum of scholarship payload
	 */
	static computeHash(content) {
		const str = typeof content === "string" ? content : JSON.stringify(content);
		return crypto.createHash("sha256").update(str).digest("hex");
	}

	/**
	 * Generate a deterministic canonical slug
	 */
	static generateSlug(org, title, level = "") {
		const cleanOrg = String(org || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.slice(0, 15);
		const cleanTitle = String(title || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.slice(0, 45);
		const cleanLevel = level ? `-${level.toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "";

		return `${cleanOrg}-${cleanTitle}${cleanLevel}`.replace(/-+/g, "-").replace(/^-|-$/g, "");
	}

	/**
	 * Generate a normalized title fingerprint for cross-source comparison
	 */
	static titleFingerprint(title) {
		return String(title || "")
			.toLowerCase()
			.replace(/\b(scheme|scholarship|yojana|grant|for|the|and|of|in|programme|students?)\b/gi, "")
			.replace(/[^a-z0-9]/g, "")
			.trim();
	}

	/**
	 * Checks if two scholarship titles represent the same underlying scheme
	 */
	static areDuplicates(itemA, itemB) {
		if (itemA.slug && itemB.slug && itemA.slug === itemB.slug) return true;
		if (itemA.sourceUrl && itemB.sourceUrl && itemA.sourceUrl === itemB.sourceUrl) return true;

		const fpA = this.titleFingerprint(itemA.title);
		const fpB = this.titleFingerprint(itemB.title);

		if (fpA && fpB && (fpA === fpB || fpA.includes(fpB) || fpB.includes(fpA))) {
			// Check organization compatibility
			const orgA = (itemA.organization || "").toLowerCase();
			const orgB = (itemB.organization || "").toLowerCase();
			if (orgA === orgB || orgA.includes(orgB) || orgB.includes(orgA)) {
				return true;
			}
		}

		return false;
	}
}

export default Deduplicator;
