import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";
import { translationRequestSchema, translatePublicTitle, TranslationError } from "../services/translationService.js";

export function createTranslationController({
	translate = translatePublicTitle,
	loadScholarship = id => Scholarship.findOne({
		...(mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id }),
		"publication.state": "published",
	}).select("title").lean(),
} = {}) {
	return async (req, res) => {
		const parsed = translationRequestSchema.safeParse(req.body);
		if (!parsed.success) return res.status(400).json({ success: false, message: "Select a valid source and target language. Only language settings are accepted." });
		try {
			const scholarship = await loadScholarship(req.params.id);
			if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found." });
			const data = await translate({ text: scholarship.title, ...parsed.data });
			res.setHeader("Cache-Control", "no-store");
			return res.json({ success: true, data });
		} catch (error) {
			return res.status(error instanceof TranslationError ? error.status : 503).json({ success: false,
				code: error instanceof TranslationError ? error.code : "TRANSLATION_UNAVAILABLE",
				message: error instanceof TranslationError ? error.message : "Translation is temporarily unavailable. Please try again." });
		}
	};
}

export const translateScholarshipTitle = createTranslationController();
