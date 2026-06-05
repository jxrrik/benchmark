# Teste IA Local - Visual Challenge Runner

Script basico para testar modelos de visao rodando localmente (Ollama) contra prints de tela.

## O que faz

1. **Captura a tela** inteira (ou usa uma imagem existente)
2. **Cropara** uma regiao especifica (opcional)
3. **Envia** a imagem para um modelo multimodal local via Ollama
4. **Recebe** a descricao/analise da IA
5. **Salva** resultado em `output/`

## Pre-requisitos

- Python 3.8+
- Ollama instalado e rodando: https://ollama.com
- Modelo multimodal baixado (ex: `ollama pull llava:13b`)

## Instalacao

```bash
cd /home/server/vidal/nfe-ecac/test
pip install Pillow
```

## Uso

### 1. Teste basico (captura tela + pergunta generica)
```bash
python3 main.py
```

### 2. Usar imagem ja salva
```bash
python3 main.py -i /caminho/para/print.png
```

### 3. Capturar + cropar regiao especifica
```bash
python3 main.py -c 200,150,400,300
```

### 4. Prompt customizado
```bash
python3 main.py -p "Qual o texto deste captcha? Responda apenas o codigo."
```

### 5. Trocar modelo
```bash
python3 main.py -m moondream:1.8b
```

## Variaveis de ambiente

| Variavel       | Padrao                                 | Descricao          |
|----------------|----------------------------------------|--------------------|
| OLLAMA_URL     | http://localhost:11434/api/generate    | Endpoint Ollama    |
| OLLAMA_MODEL   | llava:13b                              | Nome do modelo     |

## Estrutura de saida

```
output/
  screenshot_YYYYMMDD_HHMMSS.png   # Print bruto
  cropped_YYYYMMDD_HHMMSS.png      # Imagem croipada (se usou -c)
  debug_YYYYMMDD_HHMMSS.png       # Copia final enviada a IA
  result_YYYYMMDD_HHMMSS.json     # Resposta completa da IA
```

## Proximos passos

- Teste com prints do desafio real no nfe-ecac
- Compare desempenho entre modelos (llava vs moondream vs bakllava)
- Ajuste o prompt para instrucoes mais especificas de automacao
