# calc.fatfort.com — the calculator API, migrated from tools.abaj.ai (Aug 2026).
#
# This container serves BOTH its static frontend and its /api/*, the same shape
# as agents.fatfort.com. That is deliberate: it means the shared Caddyfile needs
# only a reverse_proxy line, so adding this host is a graceful `caddy reload`
# rather than a recreation of the container that also fronts two
# mission-critical businesses.
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
# The frontend is baked into the image rather than bind-mounted, so the shared
# Caddy container needs no new volume — and therefore no recreation, which would
# briefly drop tutorsfirst.com.au and arcade.express along with it.
COPY frontend /srv/frontend
COPY --from=build /out/calc /usr/local/bin/calc
EXPOSE 27439
# main.go registers "/" as a catch-all OPTIONS handler that answers 200 to any
# unmatched request, so the root path doubles as a liveness probe with no code
# change. There is no dedicated /health endpoint and none is needed — the
# process is stateless, so "listening" is the whole of "healthy".
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:27439/ >/dev/null || exit 1
CMD ["/usr/local/bin/calc"]
