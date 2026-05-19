FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/index.js"]