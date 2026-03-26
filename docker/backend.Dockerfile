# Backend Dockerfile - Simple Node.js setup
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose backend port
EXPOSE 5000

# Start the server
CMD ["npm", "run", "dev"]
