import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use process.cwd() as we always run from root via npm scripts
  let distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    // Check if maybe we are inside dist/server?
    console.log(`[static] Could not find dist/public at ${distPath}, checking fallback...`);
    distPath = path.resolve(process.cwd(), "public");
  }
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));



  // fall through to index.html if the file doesn't exist
  // We use a pathless middleware to avoid path-to-regexp issues in Express 5
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    next();
  });
}
