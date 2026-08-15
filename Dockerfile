# calc.fatfort.com — the calculator API, migrated from tools.abaj.ai (Aug 2026).
#
# This container serves ONLY /api/*. The static frontend is bind-mounted into
# Caddy and served by file_server, the same split fatfort.com already uses —
# so there is no reason for a Go process to also be a static file server.
#
# On the source box this ran as `tools-backend.service` with User=root. It does
# not need root, a shell, or a package manager, hence the two-stage build down
# to a static binary on a minimal base.

FROM golang:1.23-alpine AS build
WORKDIR /src
# go.mod declares go 1.19 and the module has no dependencies (a 30-byte go.mod,
# net/http only), so there is nothing to download and no lockfile to honour.
COPY backend/go.mod backend/main.go ./
# CGO off yields a fully static binary that runs on any base image; -s -w drops
# the symbol table and DWARF, which is all dead weight for a calculator.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/calc .

# Alpine rather than scratch purely so busybox wget exists for HEALTHCHECK.
FROM alpine:3.20
# No passwd entry is needed: the binary reads no files, opens no home directory
# and writes nothing. compose pins the uid (see docker-compose.yml).
COPY --from=build /out/calc /usr/local/bin/calc
EXPOSE 27439
# main.go registers "/" as a catch-all OPTIONS handler that answers 200 to any
# unmatched request, so the root path doubles as a liveness probe with no code
# change. There is no dedicated /health endpoint and none is needed — the
# process is stateless, so "listening" is the whole of "healthy".
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:27439/ >/dev/null || exit 1
CMD ["/usr/local/bin/calc"]
