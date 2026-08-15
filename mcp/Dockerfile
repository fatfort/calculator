# calc-mcp — Streamable HTTP MCP server wrapping the calc API.
# The stdio transport needs no container at all; this image exists only for
# the remote endpoint served at https://calc.fatfort.com/mcp.
FROM node:22-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Inside the container we must bind all interfaces; the compose file publishes
# only on the host's loopback.
ENV MCP_HOST=0.0.0.0 \
    MCP_PORT=5004 \
    CALC_API_BASE=http://calc:27439/api

EXPOSE 5004
USER node
CMD ["node", "src/http.js"]
