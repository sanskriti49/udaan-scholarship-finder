//import dotenv from "dotenv";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import scholarshipRoutes from "./src/routes/scholarshipRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import verifyRoutes from "./src/routes/verifyRoutes.js";
import profileRoutes from "./src/routes/profileRoutes.js";
import bookmarkRoutes from "./src/routes/bookmarkRoutes.js";
import { apiLimiter } from "./src/middlewares/rateLimiterMiddleware.js";
import { crawlerScheduler } from "./src/ingestion/core/Scheduler.js";
import { notificationScheduler } from "./src/jobs/notificationScheduler.js";
import {
	startReminderWorker,
	closeReminderWorker,
} from "./src/workers/reminderWorker.js";
import { closeReminderQueue } from "./src/queues/reminderQueue.js";
import { closeRedisClient } from "./src/config/redis.js";
import { bootstrapDatabase } from "./src/utils/bootstrapDatabase.js";

const app = express();

// Parse and normalize allowed CORS origins
const configuredFrontends = (process.env.FRONTEND_URL || "")
	.split(",")
	.map((u) => u.trim().replace(/\/+$/, ""))
	.filter(Boolean);

const defaultAllowed = [
	"http://localhost:5173",
	"http://localhost:5174",
	"http://localhost:5175",
	"http://localhost:3000",
	"http://127.0.0.1:5173",
	"http://127.0.0.1:5174",
	"http://127.0.0.1:5175",
	"http://127.0.0.1:3000",
	"https://udaan-scholarships.vercel.app",
];

const allowedOrigins = Array.from(new Set([...configuredFrontends, ...defaultAllowed]));

/**
 * Validates incoming origin against allowed frontends, local dev ports, and deployment domains
 */
export const isOriginAllowed = (origin) => {
	// Allow requests with no origin (curl, mobile apps, server-to-server)
	if (!origin) {
		return true;
	}

	const cleanOrigin = origin.trim().replace(/\/+$/, "");

	// Check explicit whitelist
	if (allowedOrigins.includes(cleanOrigin)) {
		return true;
	}

	// Allow localhost, 127.0.0.1, or IPv6 loopback [::1] on any port
	if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(cleanOrigin)) {
		return true;
	}

	// Allow private LAN IP networks (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
	if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(cleanOrigin)) {
		return true;
	}

	// Allow all Vercel production and preview deployments (*.vercel.app)
	if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/i.test(cleanOrigin)) {
		return true;
	}

	// Allow all Render deployments (*.onrender.com)
	if (/^https:\/\/([a-zA-Z0-9_-]+\.)*onrender\.com$/i.test(cleanOrigin)) {
		return true;
	}

	// In non-production environments, allow all origins to eliminate local dev blockers
	if (process.env.NODE_ENV !== "production") {
		return true;
	}

	return false;
};

const corsOptions = {
	origin: (origin, callback) => {
		if (isOriginAllowed(origin)) {
			return callback(null, true);
		}
		return callback(null, false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
	allowedHeaders: [
		"Origin",
		"X-Requested-With",
		"Content-Type",
		"Accept",
		"Authorization",
		"X-Cache",
		"Access-Control-Request-Method",
		"Access-Control-Request-Headers",
	],
	exposedHeaders: [
		"X-Cache",
		"X-RateLimit-Limit",
		"X-RateLimit-Remaining",
		"X-RateLimit-Reset",
		"Retry-After",
	],
	optionsSuccessStatus: 204,
};

// Security HTTP headers
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
	}),
);

// HTTP request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(cors(corsOptions));
app.use(express.json());

// Global API Rate Limiting
app.use("/api", apiLimiter);

connectDB().then(() => {
	bootstrapDatabase();
});

// Canonical API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/scholarships", scholarshipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/user/profile", profileRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Fallback Aliases (protects against clients calling without /api prefix)
app.use("/auth", authRoutes);
app.use("/scholarships", scholarshipRoutes);
app.use("/notifications", notificationRoutes);
app.use("/verify", verifyRoutes);
app.use("/user/profile", profileRoutes);
app.use("/bookmarks", bookmarkRoutes);

app.get("/", (req, res) => {
	res.send("Backend running...");
});
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
	console.log(`Server running safely on port ${PORT}`);
	crawlerScheduler.start();
	notificationScheduler.start();

	// Initialize BullMQ worker if enabled (default true)
	if (process.env.ENABLE_BULLMQ_WORKER !== "false") {
		startReminderWorker();
	}
});

/**
 * Graceful Shutdown for Process Termination (SIGTERM / SIGINT)
 */
const gracefulShutdown = async (signal) => {
	console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

	crawlerScheduler.stop();
	notificationScheduler.stop();

	server.close(async () => {
		console.log("[Server] HTTP server closed.");
		try {
			await closeReminderWorker();
			await closeReminderQueue();
			await closeRedisClient();
			await mongoose.disconnect();
			console.log(
				"[Server] Database and queue connections closed. Exiting process.",
			);
			process.exit(0);
		} catch (err) {
			console.error("[Server] Error during teardown:", err.message);
			process.exit(1);
		}
	});

	// Force exit after 10s timeout if graceful shutdown hangs
	setTimeout(() => {
		console.error("[Server] Forced shutdown due to timeout.");
		process.exit(1);
	}, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
