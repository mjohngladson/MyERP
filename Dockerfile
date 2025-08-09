FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package.json frontend/package-lock.json ./

# Create .npmrc for dependency resolution
RUN echo "legacy-peer-deps=true" > .npmrc && \
    echo "auto-install-peers=true" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "audit=false" >> .npmrc

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./

# Set environment variables
ENV NODE_OPTIONS="--openssl-legacy-provider"
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]