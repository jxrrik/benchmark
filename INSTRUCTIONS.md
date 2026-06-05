# Instrucoes para IA - CAPTCHA Solver

> Use este documento para outra IA executar o teste automaticamente.

## Pre-requisitos
- Windows com Node.js instalado
- Ollama instalado (se nao tiver, o script avisa)
- Pasta de trabalho: `C:\Users\<usuario>\nopecha\test`

## Passos

### 1. Clone o repositorio
```bash
cd C:\Users\<usuario>\nopecha\test
git clone https://github.com/jxrrik/benchmark.git .
```
Ou se a pasta nao estiver vazia:
```bash
cd C:\Users\<usuario>\nopecha
git clone https://github.com/jxrrik/benchmark.git test
```

### 2. Instale dependencias
```bash
cd C:\Users\<usuario>\nopecha\test
npm install
```

### 3. Verifique Ollama
```bash
ollama --version
```
Se nao estiver instalado, baixe em https://ollama.com/download/windows e instale antes de continuar.

### 4. Rode o teste
```bash
cd C:\Users\<usuario>\nopecha\test
node main.js "Sem título.jpg"
```

O script `main.js` vai:
1. Verificar se `jimp` esta instalado (`npm install` automatico se nao)
2. Verificar se Ollama esta rodando (inicia automatico se necessario)
3. Verificar se o modelo `qwen3-vl:8b` esta baixado (download automatico se necessario)
4. Executar o `captcha_solver.js` que:
   - Croppa a imagem segundo as coordenadas do manual
   - Gera a imagem composta (challenge + grid 3x3)
   - Envia para Qwen3-VL via Ollama
   - Exibe os numeros identificados

### 5. Resultado esperado
A IA deve responder com os numeros correspondentes ao desafio, por exemplo:
```
Resposta: 1, 4, 7, 8
```

## Arquivos principais
- `main.js` — instalador e runner
- `captcha_solver.js` — logica de crop e consulta a IA
- `Sem título.jpg` — imagem de teste

## Troubleshooting
- Se o Ollama nao iniciar: rode `ollama serve` em outro terminal primeiro
- Se der timeout: verifique se a GPU esta sendo usada (`nvidia-smi`)
- Modelo padrao: `qwen3-vl:8b` (unico testado com 100% de acuracia)
