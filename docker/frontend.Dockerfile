# Simple Frontend Dockerfile for Development
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start development server with host flag
CMD ["npm", "run", "dev", "--", "--host"]
