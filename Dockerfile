# Use official Node.js 22 Alpine (latest + lightweight)
FROM node:22-alpine

# Run as root to handle permission issues
USER root

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions before copying
RUN mkdir -p /app/backups /app/exports /app/data && \
    chmod 777 /app/backups /app/exports /app/data

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the rest of the project
COPY . .

# Change ownership of all files to root (optional but clean)
# RUN chown -R root:root /app

# Expose port
EXPOSE 3000

# Environment mode
ENV NODE_ENV=production

# Start your app as root
CMD ["node", "main.js"]
