import { apiLimiter } from "./rateLimiterMiddleware.js";

// Canonical /api requests already pass through apiLimiter in server.js.
export function protectScholarshipAlias(app) {
	app.use("/scholarships", apiLimiter);
}
