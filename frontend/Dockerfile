FROM node:18-alpine

WORKDIR /app

# Copy package files (both npm and yarn)
COPY package*.json yarn.lock* ./

# Install dependencies - use yarn since you have yarn.lock
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN yarn build

# Install serve to serve the build
RUN npm install -g serve

EXPOSE 3000

# Serve the build
CMD ["serve", "-s", "build", "-l", "3000"]