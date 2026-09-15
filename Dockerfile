# ==========================================
# 1. Base Image: Lean, secure Alpine Linux with Node.js 20 LTS
# ==========================================
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install dependencies first (leverages Docker layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the application source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Security Best Practice: Run as non-privileged 'node' user instead of root
USER node

# Expose backend API port
EXPOSE 3000

# Health check to ensure Express is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the backend server
CMD ["node", "src/server.js"]
