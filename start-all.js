
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Simulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load .env manually to ensure variables are set
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ Carregando variáveis de ambiente do .env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
        }
    });
} else {
    console.warn('⚠️ Arquivo .env não encontrado!');
}

// 2. Start the server using tsx directly with watch mode
console.log('🚀 Iniciando servidor backend na porta 5000...');
const server = spawn('npx', ['tsx', '--watch', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '5000' }
});

server.on('close', (code) => {
    console.log(`Servidor backend encerrou com código ${code}`);
});

// 3. Start the frontend using vite in parallel (optional, but good for dev)
console.log('🚀 Iniciando frontend Vite...');
const frontend = spawn('npm', ['run', 'dev', '--', '--port', '8080'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});
