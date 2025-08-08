FROM node:18-alpine

WORKDIR /app

# Copy package files (both npm and yarn)
COPY package*.json yarn.lock* ./

# Clean install with specific Node version
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Copy source code
COPY . .

# Set NODE_OPTIONS for legacy compatibility
ENV NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096"

# Build the app
RUN yarn build

# Production stage
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html

# Copy custom nginx config if needed
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]