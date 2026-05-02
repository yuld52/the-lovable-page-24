import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsxBin = path.join(__dirname, 'node_modules', '.bin', 'tsx');

console.log('Starting Meteorfy server...');
const server = spawn(tsxBin, ['--watch', 'server/index.ts'], {
    stdio: 'inherit',
    shell: false,
    cwd: __dirname,
    env: { ...process.env, PORT: '5000' }
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code ?? 0);
});

const cleanup = () => {
    server.kill();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
