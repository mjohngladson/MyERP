FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies with npm
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment for legacy build
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]