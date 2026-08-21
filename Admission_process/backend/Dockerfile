FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies (npm ci with fallback to npm install)
RUN npm ci || npm install

# Copy source files
COPY . .

# Build TypeScript to /app/dist
RUN npm run build

# Create necessary upload and log directories with proper permissions for non-root user
RUN mkdir -p /app/uploads/avatars /app/uploads/handbookPdf /app/logs && \
    chown -R node:node /app

USER node

EXPOSE 5000

# Health check verifies /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const req = require('http').request({ host: '127.0.0.1', port: process.env.PORT || 5000, path: '/api/health', timeout: 3000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); }); req.end();"

CMD ["node", "dist/index.js"]