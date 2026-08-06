# Dockerfile for running SooQuoting on Raspberry Pi (ARM64 / v7) or x86_64
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend and Express server
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create volume mount directory for persistent database on Raspberry Pi
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
