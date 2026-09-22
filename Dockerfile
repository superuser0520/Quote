# Dockerfile for running SooQuoting on Raspberry Pi (ARM64 / v7) or x86_64
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source files
COPY . .

# Build Vite frontend and Express server
RUN npm run build

# Remove build-only dependencies before copying modules to the runtime image.
# This avoids a second full npm install, which is especially slow on Pi SD cards.
RUN npm prune --omit=dev --no-audit --no-fund

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create volume mount directory for persistent database on Raspberry Pi
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
