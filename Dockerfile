# Use the official Node.js 18 image as the build environment
FROM node:18 AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

# Cloud Run automatically sets the PORT environment variable
ENV PORT=8080

# Start Next.js — it automatically picks up the PORT variable
CMD ["npm", "run", "start"]