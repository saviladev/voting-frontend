# Stage 1: Build the Ionic/Angular application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (with wildcards to handle missing files)
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Copy the rest of the application code
COPY . .

# Enable Corepack for pnpm support
RUN corepack enable

# Install dependencies based on lockfile
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Build the application with environment variable
RUN \
  if [ -f yarn.lock ]; then yarn build --configuration production; \
  elif [ -f package-lock.json ]; then npm run build -- --configuration production; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build --configuration production; \
  else npm run build -- --configuration production; \
  fi

# Stage 2: Create a minimal image with just the built files
FROM alpine:latest

# Copy the built files from builder stage to /app/www (for volume mounting)
COPY --from=builder /app/www /app/www

# Expose the directory as a volume
VOLUME /app/www

# Keep the container running (nginx will mount the files via volume)
CMD ["tail", "-f", "/dev/null"]
