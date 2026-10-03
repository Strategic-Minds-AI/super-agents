FROM node:22-slim
WORKDIR /app

COPY runtime/package.json ./package.json
RUN npm install --omit=dev

COPY runtime/src ./src
COPY runtime/migrations ./migrations
COPY agents ./agents

ENV AGENT_CONFIG_DIR=/app/agents
EXPOSE 8080

CMD ["sh", "-c", "npm run migrate && npm start"]
