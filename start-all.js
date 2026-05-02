import { spawn } from 'child_process';

let serverReady = false;

// Start the server using the local tsx binary (already installed in node_modules)
console.log('Starting Meteorfy server...');
const server = spawn('./node_modules/.bin/tsx', ['--watch', 'server/index.ts'], {
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: '5000' }
});

server.stdout?.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('serving on port') || output.includes('METEORFY SERVER')) {
        serverReady = true;
    }
});

server.stderr?.on('data', (data) => {
    process.stderr.write(data.toString());
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

setTimeout(() => {
    if (!serverReady) {
        console.log('Waiting for server to start...');
    }
}, 5000);
