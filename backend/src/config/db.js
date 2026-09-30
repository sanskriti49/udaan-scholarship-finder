import dns from "dns";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (error.code === "ECONNREFUSED" && error.syscall === "querySrv") {
      console.warn(
        "[MongoDB] System DNS rejected querySrv. Retrying with public DNS fallback (8.8.8.8, 1.1.1.1)...",
      );
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(
          `MongoDB Connected (via DNS fallback): ${conn.connection.host}`,
        );
        return conn;
      } catch (fallbackError) {
        console.error(
          `MongoDB Error (after DNS retry): ${fallbackError.message}`,
        );
        process.exit(1);
      }
    }
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
