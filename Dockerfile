FROM node:18-alpine as builder

WORKDIR /app

# Copy frontend package files first for better caching
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Create .npmrc file with necessary config
RUN echo 'legacy-peer-deps=true' > ./frontend/.npmrc && \
    echo 'auto-install-peers=true' >> ./frontend/.npmrc && \
    echo 'fund=false' >> ./frontend/.npmrc && \
    echo 'audit=false' >> ./frontend/.npmrc

# Install frontend dependencies
RUN cd frontend && npm install --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./frontend/

# Set environment variables for build
ENV NODE_OPTIONS="--openssl-legacy-provider"
ENV GENERATE_SOURCEMAP=false

# Build the frontend application
RUN cd frontend && npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/frontend/build /usr/share/nginx/html

# Create a simple nginx config for SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $$uri $$uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]