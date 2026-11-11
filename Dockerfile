# Build in imaginea completa, rulare in aceeasi versiune de Node: aplicatia
# foloseste `node:sqlite`, built-in din Node 24, deci nu se compileaza nimic
# nativ si nu e nevoie de toolchain in imaginea finala.
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
# tzdata: fara el, Node isi rezolva singur fusul (are baza proprie), dar toate
# uneltele din shell raman pe UTC — iar `docker exec ... date` da alta ora decat
# aplicatia. su-exec: coborarea de la root la `node` in docker-entrypoint.sh.
RUN apk add --no-cache tzdata su-exec
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PONTAJ_DB=/data/pontaj.db

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY docker-entrypoint.sh /usr/local/bin/

# Datele (baza SQLite) stau in /data: un singur director de pastrat la backup.
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
	CMD wget -q --spider http://127.0.0.1:3000/login || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "build"]
