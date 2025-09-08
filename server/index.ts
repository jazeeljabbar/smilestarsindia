import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import apiRoutes from "./routes";

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Apply JSON parsing only to non-upload routes
app.use((req, res, next) => {
  if (req.path.includes('/students/bulk-upload') || req.path.includes('/students/template')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// API routes
app.use('/api', apiRoutes);

const PORT = Number(process.env.PORT) || 5000;

// Development setup
if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

server.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});
