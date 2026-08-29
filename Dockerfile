FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY README.md LICENSE ./

EXPOSE 3000
ENV PORT=3000
ENV MCP_PATH=/mcp

# node:20-slim ya trae un usuario sin privilegios (`node`, uid 1000); el
# servidor ejecuta binarios externos (newman/codegraph/engram) y maneja
# GITHUB_TOKEN, así que no debe correr como root dentro del contenedor.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
