FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY src ./src
# Шаблоны писем и логотип нужны ветке мероприятия в рантайме,
# иначе она падает на чтении файла.
COPY templates ./templates
COPY assets ./assets
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
