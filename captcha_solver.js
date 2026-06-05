/**
 * CAPTCHA Solver - Node.js
 * Corta imagem segundo metodologia do manual, separa em pastas e consulta Ollama.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const Jimp = require('jimp');

const INPUT_IMAGE = process.argv[2] || 'Sem título.jpg';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3-vl:8b';
const TEMP_DIR = path.join(__dirname, 'temp');

// Coordenadas do manual
const CAPTCHA_LEFT = 779;
const CAPTCHA_TOP = 296;
const CAPTCHA_WIDTH = 400;
const CAPTCHA_HEIGHT = 500;

const REF_X = 5;
const REF_Y = 5;
const REF_WIDTH = 390;
const REF_HEIGHT = 110;

const GRID_X = 5;
const GRID_Y = 120;
const GRID_W = 390;
const GRID_H = 375;
const ESPACO_H = 8;
const ESPACO_V = 8;
const MARGEM = 1;

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTimestamp() {
    return new Date().toISOString().replace(/[:T]/g, '_').split('.')[0];
}

async function saveDebug(name, image) {
    const debugDir = path.join(TEMP_DIR, 'debug');
    ensureDir(debugDir);
    await image.writeAsync(path.join(debugDir, `${name}.png`));
}

async function cropCaptcha(inputPath) {
    const image = await Jimp.read(inputPath);
    console.log(`[INFO] Imagem original: ${image.bitmap.width}x${image.bitmap.height}`);

    // 1. Crop da área do CAPTCHA
    const captcha = image.clone();
    captcha.crop(CAPTCHA_LEFT, CAPTCHA_TOP, CAPTCHA_WIDTH, CAPTCHA_HEIGHT);
    console.log(`[OK] CAPTCHA crop: ${CAPTCHA_WIDTH}x${CAPTCHA_HEIGHT} @ (${CAPTCHA_LEFT},${CAPTCHA_TOP})`);
    await saveDebug('captcha_full', captcha);

    return captcha;
}

async function extractChallenge(captcha) {
    const challenge = captcha.clone();
    challenge.crop(REF_X, REF_Y, REF_WIDTH, REF_HEIGHT);
    console.log(`[OK] Challenge crop: ${REF_WIDTH}x${REF_HEIGHT} @ (${REF_X},${REF_Y})`);

    const questionDir = path.join(TEMP_DIR, 'question');
    ensureDir(questionDir);
    const challengePath = path.join(questionDir, 'challenge.png');
    await challenge.writeAsync(challengePath);
    console.log(`[OK] Challenge salvo: ${challengePath}`);
    return challenge;
}

async function extractGrid(captcha) {
    const boxW = Math.floor((GRID_W - (2 * ESPACO_H)) / 3);
    const boxH = Math.floor((GRID_H - (2 * ESPACO_V)) / 3);
    const imgsDir = path.join(TEMP_DIR, 'imgs');
    ensureDir(imgsDir);

    const images = [];
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = GRID_X + (col * (boxW + ESPACO_H)) + MARGEM;
        const y = GRID_Y + (row * (boxH + ESPACO_V)) + MARGEM;
        const w = boxW - 2;
        const h = boxH - 2;

        const cell = captcha.clone();
        cell.crop(x, y, w, h);

        const cellPath = path.join(imgsDir, `${i + 1}.png`);
        await cell.writeAsync(cellPath);
        images.push({ num: i + 1, image: cell, path: cellPath, x, y, w, h });
        console.log(`[OK] Grid ${i + 1}: ${w}x${h} @ (${x},${y})`);
    }
    return images;
}

async function createComposite(challenge, gridImages) {
    // Cria uma imagem composta com challenge no topo e grid 3x3 numerado embaixo
    const padding = 20;
    const labelHeight = 40;
    const cellW = gridImages[0].image.bitmap.width;
    const cellH = gridImages[0].image.bitmap.height;

    const totalW = Math.max(challenge.bitmap.width, cellW * 3 + padding * 4);
    const totalH = challenge.bitmap.height + labelHeight + (cellH + labelHeight) * 3 + padding * 5;

    const composite = new Jimp(totalW, totalH, 0xFFFFFFFF); // fundo branco

    // Fonte para números
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // Desenha título do desafio
    composite.print(font, padding, 10, 'DESAFIO (challenge):');

    // Cola challenge
    const challengeY = 50;
    composite.composite(challenge, padding, challengeY);

    // Título do grid
    let gridStartY = challengeY + challenge.bitmap.height + 30;
    composite.print(font, padding, gridStartY - 35, 'OPCOES (escolha as corretas):');

    // Cola grid 3x3
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = padding + col * (cellW + padding);
        const y = gridStartY + row * (cellH + labelHeight + padding);

        // Número
        composite.print(font, x, y, `${i + 1}`);
        // Imagem
        composite.composite(gridImages[i].image, x, y + labelHeight);
    }

    const compositePath = path.join(TEMP_DIR, 'composite.png');
    await composite.writeAsync(compositePath);
    console.log(`[OK] Imagem composta criada: ${compositePath}`);
    return compositePath;
}

function encodeImage(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    return buffer.toString('base64');
}

async function askOllama(imageBase64, prompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL,
            prompt: prompt,
            images: [imageBase64],
            stream: false,
        });

        const req = http.request(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 120000,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json.response || '');
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`JSON parse error: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
    });
}

function extractNumbers(text) {
    const patterns = [
        /(\d+(?:\s*,\s*\d+)+)/,
        /numeros?:\s*([0-9,\s]+)/i,
        /resposta:\s*([0-9,\s]+)/i,
        /imagens?:\s*([0-9,\s]+)/i,
        /([0-9]+[\s,]+[0-9]+[\s,]*[0-9]*)/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const nums = match[1].match(/[1-9]/g);
            if (nums && nums.length > 0) {
                return [...new Set(nums.map(Number))].sort((a, b) => a - b);
            }
        }
    }

    // Fallback
    const digits = text.match(/[1-9]/g);
    if (digits && digits.length > 0) {
        return [...new Set(digits.map(Number))].sort((a, b) => a - b);
    }

    return [];
}

async function main() {
    const imgPath = path.resolve(INPUT_IMAGE);
    if (!fs.existsSync(imgPath)) {
        console.error(`[ERRO] Imagem nao encontrada: ${imgPath}`);
        process.exit(1);
    }

    ensureDir(TEMP_DIR);
    console.log(`\n========== CAPTCHA SOLVER ==========`);
    console.log(`[INFO] Input: ${imgPath}`);
    console.log(`[INFO] Ollama: ${MODEL} @ ${OLLAMA_URL}`);
    console.log(`====================================\n`);

    // 1. Crop CAPTCHA
    const captcha = await cropCaptcha(imgPath);

    // 2. Extract challenge
    const challenge = await extractChallenge(captcha);

    // 3. Extract grid
    const grid = await extractGrid(captcha);

    // 4. Create composite image
    const compositePath = await createComposite(challenge, grid);

    // 5. Ask Ollama
    const b64 = encodeImage(compositePath);
    const prompt = `Analise o DESAFIO na parte superior da imagem. Em seguida, identifique quais dos 9 quadrantes numerados (1 a 9) na grade inferior correspondem a resposta correta do desafio. IMPORTANTE: Responda APENAS com os numeros separados por virgula, sem nenhum texto adicional. Exemplo: 1, 4, 7`;

    console.log(`\n[INFO] Enviando para Ollama (${MODEL})...`);
    const start = Date.now();
    const response = await askOllama(b64, prompt);
    const elapsed = Date.now() - start;

    console.log(`\n========== RESPOSTA ==========`);
    console.log(response);
    console.log(`==============================`);
    console.log(`Tempo: ${elapsed}ms`);

    // 6. Parse
    const numbers = extractNumbers(response);
    console.log(`\n[Numeros extraidos]: ${numbers.join(', ') || 'NENHUM'}`);

    // 7. Log das pastas
    console.log(`\n[ESTRUTURA GERADA]`);
    console.log(`  temp/question/challenge.png`);
    console.log(`  temp/imgs/{1..9}.png`);
    console.log(`  temp/composite.png`);

    return numbers;
}

main().catch(err => {
    console.error(`[ERRO FATAL] ${err.message}`);
    process.exit(1);
});
