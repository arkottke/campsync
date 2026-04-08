# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use --legacy-peer-deps for peer dependency conflicts in build environment)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .
# Vite env vars are compiled into the frontend at build time.
ARG VITE_PB_URL=http://localhost:8090
ENV VITE_PB_URL=${VITE_PB_URL}


# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the frontend app
RUN npm install -g serve

# Download PocketBase
ARG POCKETBASE_VERSION=0.36.8
RUN apk add --no-cache curl unzip && \
    curl -L -o /tmp/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip && \
    unzip -q /tmp/pocketbase.zip -d /app/pocketbase && \
    chmod +x /app/pocketbase/pocketbase && \
    rm /tmp/pocketbase.zip && \
    apk del curl unzip

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy migrations and entrypoint
COPY pb_migrations /app/pb_migrations
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create data directory for PocketBase
RUN mkdir -p /app/pb_data

# Expose ports
EXPOSE 3000 8090

# Set environment variables
ENV NODE_ENV=production

# Start both services
CMD ["/app/entrypoint.sh"]
