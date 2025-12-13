FROM node:22-bookworm-slim

# ffmpeg を入れる
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存を入れる
COPY package*.json ./
RUN npm ci --omit=dev

# ソースと音声ファイル
COPY . .

ENV NODE_ENV=production
CMD ["npm", "start"]
