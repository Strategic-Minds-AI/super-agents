FROM node:20-slim
WORKDIR /app
COPY package.json worker.js ./
# No dependencies to install — pure Node.js stdlib
CMD ["node", "worker.js"]