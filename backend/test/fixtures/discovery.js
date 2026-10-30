// Synthetic policies and fixed time: no claims about real scholarships.
export const now = new Date("2026-10-30T06:00:00Z");
export const student = { state: "UP", educationLevel: "UG", stream: "Engineering", familyIncome: 200000, casteCategory: "OBC", percentage: 80 };
export const condition = (field, targetValue, operator = "EQ", id = field) => ({ type: "CONDITION", id, field, operator, targetValue });
const policy = (id, title, score, rules, extra = {}) => ({
	_id: id, title, score, state: "All India", rules, publication: { state: "published" },
	verified: true, freshness: { lastVerifiedAt: now, firstSeenAt: now },
	currentCycle: { opensAt: "2026-10-01", closesAt: "2026-11-30" }, ...extra,
});
export const scholarships = [
	policy("mh", "Engineering Merit Maharashtra", 30, [condition("state", "Maharashtra")]),
	policy("school", "Engineering Merit School", 25, [condition("educationLevel", "Class 10")]),
	policy("national-sc", "Engineering Merit National SC", 20, [condition("casteCategory", ["SC"], "IN")]),
	policy("up", "Engineering Merit UP", 10, [condition("state", "Uttar Pradesh"), condition("educationLevel", "UG"), condition("stream", ["Engineering"], "IN")]),
	policy("national", "Engineering Merit National", 9, [condition("familyIncome", 300000, "LTE"), condition("percentage", 75, "GTE")]),
	policy("incomplete", "Engineering Merit Unrecorded", 15, [], { currentCycle: null, verified: false }),
];
