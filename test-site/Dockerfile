FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends espeak-ng python3 python3-pip python3-venv && \
    python3 -m venv /opt/tts && \
    /opt/tts/bin/pip install --no-cache-dir gtts && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/tts/bin:$PATH"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
