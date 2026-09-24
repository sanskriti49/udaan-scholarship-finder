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
import { crawlerScheduler } from "./src/pipeline/scheduler.js";
import { notificationScheduler } from "./src/jobs/notificationScheduler.js";
import {
	startReminderWorker,
	closeReminderWorker,
} from "./src/workers/reminderWorker.js";
import { closeReminderQueue } from "./src/queues/reminderQueue.js";
import { closeRedisClient, isRedisAvailable } from "./src/config/redis.js";
import { bootstrapDatabase } from "./src/utils/bootstrapDatabase.js";

const app = express();

// Parse and normalize allowed CORS origins
const configuredFrontends = (process.env.FRONTEND_URL || "")
	.split(",")
	.map((u) => u.trim().replace(/\/+$/, ""))
	.filter(Boolean);

const defaultAllowed = [
	"http://localhost:5173",
	"http://localhost:3000",
	"https://udaan-scholarships.vercel.app",
];

const allowedOrigins = Array.from(new Set([...configuredFrontends, ...defaultAllowed]));

const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (curl, mobile, server-to-server)
		if (!origin) {
			return callback(null, true);
		}

		const cleanOrigin = origin.replace(/\/+$/, "");

		// Check explicit whitelist
		if (allowedOrigins.includes(cleanOrigin)) {
			return callback(null, true);
		}

		// Allow all Vercel production and preview deployments
		if (/^https:\/\/.*\.vercel\.app$/.test(cleanOrigin)) {
			return callback(null, true);
		}

		// Allow Render services
		if (/^https:\/\/.*\.onrender\.com$/.test(cleanOrigin)) {
			return callback(null, true);
		}

		return callback(null, false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"Origin",
		"X-Requested-With",
		"Content-Type",
		"Accept",
		"Authorization",
		"X-Cache",
	],
	exposedHeaders: ["X-Cache"],
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

// Health and Readiness Check Endpoint
const getHealthStatus = () => {
	const mongoState = mongoose.connection.readyState;
	const mongoStatusMap = {
		0: "disconnected",
		1: "connected",
		2: "connecting",
		3: "disconnecting",
	};

	const isDbHealthy = mongoState === 1;
	const isCacheHealthy = isRedisAvailable();

	return {
		status: isDbHealthy ? "healthy" : "degraded",
		timestamp: new Date().toISOString(),
		uptime: Math.round(process.uptime()),
		environment: process.env.NODE_ENV || "development",
		services: {
			database: {
				status: mongoStatusMap[mongoState] || "unknown",
				healthy: isDbHealthy,
			},
			redis: {
				status: isCacheHealthy ? "connected" : "fallback_mode",
				healthy: isCacheHealthy,
			},
			crawlerScheduler: {
				active: crawlerScheduler.active,
			},
			notificationScheduler: {
				active: notificationScheduler.active,
			},
		},
	};
};

app.get("/health", (req, res) => {
	const health = getHealthStatus();
	res.status(health.status === "healthy" ? 200 : 503).json(health);
});
app.get("/api/health", (req, res) => {
	const health = getHealthStatus();
	res.status(health.status === "healthy" ? 200 : 503).json(health);
});

app.get("/", (req, res) => {
	res.send("Backend running...");
});

// 404 Handler for undefined API routes
app.use((req, res, next) => {
	res.status(404).json({
		success: false,
		message: `Route not found: ${req.method} ${req.originalUrl}`,
	});
});

// Centralized JSON Error Handler Middleware
app.use((err, req, res, next) => {
	console.error("[ServerError]", err);

	// Handle malformed JSON body from express.json()
	if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
		return res.status(400).json({
			success: false,
			message: "Malformed JSON payload in request body",
		});
	}

	// Handle MongoDB CastError
	if (err.name === "CastError") {
		return res.status(400).json({
			success: false,
			message: `Invalid format for field '${err.path}'`,
		});
	}

	const statusCode = err.statusCode || err.status || 500;
	return res.status(statusCode).json({
		success: false,
		message: err.message || "Internal server error",
		...(process.env.NODE_ENV === "development" && { stack: err.stack }),
	});
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
