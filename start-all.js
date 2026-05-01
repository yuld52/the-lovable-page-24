import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Simulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load .env manually to ensure variables are set
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ Carregando variáveis de ambiente do .env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
                process.env[key.trim()] = value;
            }
        }
    });
} else {
    console.warn('⚠️ Arquivo .env não encontrado!');
}

let serverReady = false;
let viteReady = false;

// 2. Start the server using tsx directly
console.log('🚀 Iniciando servidor backend na porta 5000...');
const server = spawn('npx', ['tsx', '--watch', 'server/index.ts'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: '5000' }
});

server.stdout?.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    // Detect when server is ready
    if (output.includes('serving on port') || output.includes('METEORFY SERVER')) {
        serverReady = true;
    }
});

server.stderr?.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
});

server.on('close', (code) => {
    console.log(`Servidor backend encerrado com código ${code}`);
});

// 3. Start the frontend using vite directly (avoid recursive npm call)
console.log('🚀 Iniciando frontend Vite...');
const frontend = spawn('npx', ['vite', '--port', '8080', '--host'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env }
});

frontend.stdout?.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('Local:') || output.includes('ready in')) {
        viteReady = true;
    }
});

frontend.stderr?.on('data', (data) => {
    const output = data.toString();
    // Filter out some noisy warnings
    if (!output.includes('warn') && !output.includes('Warning')) {
        process.stderr.write(output);
    }
});

frontend.on('close', (code) => {
    console.log(`Frontend Vite encerrado com código ${code}`);
});

// Handle termination signals
const cleanup = () => {
    console.log('\n🛑 Encerrando servidores...');
    server.kill();
    frontend.kill();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Log startup status
setTimeout(() => {
    if (!serverReady) {
        console.log('⏳️  Aguardando servidor backend iniciar...');
    }
    if (!viteReady) {
        console.log('⏳️  Aguardando frontend Vite iniciar...');
    }
}, 3000);