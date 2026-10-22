import mongoose from "mongoose";

/** Immutable extraction artifact; independent of text-only snapshot deduplication. */
const schema = new mongoose.Schema({
	key: { type: String, required: true, unique: true },
	sourceId: String,
	url: { type: String, required: true, index: true },
	sourceSha256: { type: String, required: true, index: true },
	canonicalTextHash: { type: String, required: true },
	extractionMethod: String,
	data: { type: mongoose.Schema.Types.Mixed, required: true },
	firstSeenAt: Date,
	lastSeenAt: Date,
}, { timestamps: true });
schema.index({ url: 1, canonicalTextHash: 1, lastSeenAt: -1 });
export default mongoose.models.DocumentExtraction || mongoose.model("DocumentExtraction", schema);
