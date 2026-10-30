import { rankDiscovery } from "../engine/discoveryRanking.js";
import { now, scholarships, student } from "../../test/fixtures/discovery.js";

// Offline illustration using synthetic candidate text scores, not a MongoDB
// benchmark or a claim about the real catalogue's top five.
for (const search of ["Engineering Merit", "National", "Maharashtra"]) {
	const candidates = scholarships.filter(item => item.title.toLowerCase().includes(search.toLowerCase()));
	console.log(JSON.stringify({ query: search,
		before: [...candidates].sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.title),
		after: rankDiscovery(candidates, { profile: student, search, status: "all", now, limit: 5 }).data.map(item => ({ title: item.title, compatibility: item.discovery.label })),
	}, null, 2));
}
