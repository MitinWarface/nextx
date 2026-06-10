FROM node:22-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

RUN mkdir -p /app/public/uploads

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
