import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
connectDB();

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running...");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running safely on port ${PORT}`);
});
