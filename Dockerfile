# Dockerfile for Next.js アプリ
FROM node:20-alpine

WORKDIR /app

# package.json と package-lock.json をコピーして依存関係インストール
COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# アプリのソースをコピー
COPY . .

# Next.js ビルド
RUN npm run build

# ポート 3002 を公開（docker-compose.yml で 3002 にマッピング）
EXPOSE 3002

# 本番サーバー起動（例: next start）
CMD ["npm", "run", "start"]
