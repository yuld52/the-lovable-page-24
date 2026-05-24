const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

require("dotenv/config");

console.log("Starting Meteorfy server...");
const isWindows = process.platform === "win32";

const cwd = path.resolve(__dirname, "..");
const tsxBin = isWindows
  ? path.join(cwd, "node_modules", ".bin", "tsx.cmd")
  : path.join(cwd, "node_modules", ".bin", "tsx");

console.log("CWD:", cwd);
console.log("tsx path:", tsxBin);
console.log("tsx exists:", fs.existsSync(tsxBin));
console.log("NEON_DATABASE_URL:", process.env.NEON_DATABASE_URL ? "present" : "missing");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "present" : "missing");

const server = spawn(tsxBin, ["--watch", "server/index.ts"], {
  stdio: "pipe",
  shell: isWindows,
  cwd: cwd,
  env: { ...process.env, PORT: "5000", NODE_OPTIONS: "--max-old-space-size=4096" },
});

let stdout = "";
let stderr = "";

server.stdout.on("data", (data) => {
  const text = data.toString();
  stdout += text;
  process.stdout.write(`[STDOUT] ${text}`);
});

server.stderr.on("data", (data) => {
  const text = data.toString();
  stderr += text;
  process.stderr.write(`[STDERR] ${text}`);
});

server.on("error", (err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

server.on("close", (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 0);
});

setTimeout(() => {
  console.log("=== FULL STDOUT ===");
  console.log(stdout || "(empty)");
  console.log("=== FULL STDERR ===");
  console.log(stderr || "(empty)");
  console.log("Process still running, killing...");
  server.kill();
  process.exit(1);
}, 15000);

process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
