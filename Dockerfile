FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY frontend/package.json ./
COPY frontend/package-lock.json ./

# Create .npmrc file for npm configuration
RUN echo "legacy-peer-deps=true" > .npmrc && \
    echo "auto-install-peers=true" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "audit=false" >> .npmrc

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source files
COPY frontend/ ./

# Set build environment variables
ENV NODE_OPTIONS="--openssl-legacy-provider"
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Production stage - nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Configure nginx for SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $$uri $$uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port and start nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]