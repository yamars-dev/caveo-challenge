# Multi-stage build for production deployment
# Stage 1: Development (for local development)
FROM node:22-alpine AS development

WORKDIR /app

# Install system dependencies including curl for health checks
RUN apk add --no-cache curl dumb-init

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command for development (with hot reload)
CMD ["npm", "run", "dev"]

# Stage 2: Production build
FROM node:22-alpine AS production

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Remove source files, keep only built files
RUN rm -rf src tests scripts docs *.md

# Change to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly in containers
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]
