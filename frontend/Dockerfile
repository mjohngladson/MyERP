FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json ./

# Create .npmrc file inline
RUN echo "legacy-peer-deps=true" > .npmrc && \
    echo "auto-install-peers=true" >> .npmrc && \
    echo "fund=false" >> .npmrc && \
    echo "audit=false" >> .npmrc

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment for build
ENV NODE_OPTIONS="--openssl-legacy-provider"
ENV GENERATE_SOURCEMAP=false

# Build the app
RUN npm run build

# Install serve for production
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]