/**
 * CAPTCHA Test - Instalador e Runner
 * Instala dependencias, Ollama e Qwen3-VL, depois roda o solver.
 * Uso: node main.js [imagem]
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const REQUIRED_MODEL = 'qwen3-vl:8b';
const CAPTCHA_SOLVER = path.join(__dirname, 'captcha_solver.js');
const NODE_MODULES = path.join(__dirname, 'node_modules');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

function checkOllama() {
    try {
        execSync('ollama --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function checkModel(model) {
    try {
        const out = execSync('ollama list', { encoding: 'utf-8' });
        return out.includes(model);
    } catch {
        return false;
    }
}

function checkJimp() {
    return fs.existsSync(path.join(NODE_MODULES, 'jimp'));
}

function installDeps() {
    log('Instalando dependencias Node.js...');
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    log('Dependencias OK');
}

function pullModel(model) {
    return new Promise((resolve, reject) => {
        log(`Baixando modelo ${model} (pode demorar)...`);
        const proc = spawn('ollama', ['pull', model], { stdio: 'inherit' });
        proc.on('close', (code) => {
            if (code === 0) {
                log(`Modelo ${model} OK`);
                resolve();
            } else {
                reject(new Error(`ollama pull ${model} falhou (exit ${code})`));
            }
        });
        proc.on('error', reject);
    });
}

function startOllama() {
    try {
        execSync('ollama ps', { stdio: 'ignore' });
        log('Ollama ja esta rodando');
        return true;
    } catch {
        log('Iniciando Ollama...');
        try {
            spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
            // Aguarda um pouco
            let tries = 0;
            while (tries < 10) {
                try {
                    execSync('ollama ps', { stdio: 'ignore' });
                    log('Ollama pronto');
                    return true;
                } catch {
                    tries++;
                    require('child_process').execSync('timeout /t 1 >nul', { stdio: 'ignore' });
                }
            }
            return false;
        } catch {
            return false;
        }
    }
}

async function main() {
    const imagePath = process.argv[2] || 'Sem título.jpg';

    log('========================================');
    log('CAPTCHA TEST - Instalador e Runner');
    log('========================================');

    // 1. Dependencias Node
    if (!checkJimp()) {
        installDeps();
    } else {
        log('Dependencias Node OK');
    }

    // 2. Ollama
    if (!checkOllama()) {
        console.error('\n[ERRO] Ollama nao encontrado.');
        console.log('Baixe em: https://ollama.com/download/windows');
        console.log('Instale e rode este script novamente.\n');
        process.exit(1);
    }
    log('Ollama encontrado');

    // 3. Inicia servico
    if (!startOllama()) {
        console.error('[ERRO] Nao consegui iniciar o Ollama');
        process.exit(1);
    }

    // 4. Modelo
    if (!checkModel(REQUIRED_MODEL)) {
        try {
            await pullModel(REQUIRED_MODEL);
        } catch (e) {
            console.error(`[ERRO] Falha ao baixar ${REQUIRED_MODEL}: ${e.message}`);
            process.exit(1);
        }
    } else {
        log(`Modelo ${REQUIRED_MODEL} OK`);
    }

    // 5. Solver
    log('\n>>> Rodando captcha_solver.js...\n');
    const proc = spawn('node', [CAPTCHA_SOLVER, imagePath], {
        cwd: __dirname,
        stdio: 'inherit',
    });

    proc.on('close', (code) => {
        process.exit(code);
    });
}

main().catch(e => {
    console.error(`[ERRO FATAL] ${e.message}`);
    process.exit(1);
});
