# Use Playwright image which includes Node.js and browsers
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Install Python and pip
RUN apt-get update && apt-get install -y python3-pip

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY agent/requirements.txt ./agent/

# Install dependencies
RUN npm ci
# Install server dependencies
RUN cd server && npm ci
# Install Python dependencies
RUN pip3 install -r agent/requirements.txt
# Install Playwright for Python
RUN pip3 install playwright
RUN playwright install chromium

# Copy application source
COPY . .

# Build server
RUN cd server && npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server/dist/index.js"]
