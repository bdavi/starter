# Multi-stage build: compile the custom OCB distribution, then ship just
# the resulting binary + config in a minimal runtime image. See ADR-00018
# for why a custom build (redaction/attributes processors are Contrib-only
# regardless, so a full Contrib image buys nothing once the component list
# is known) and ADR-00019 for how this gets built/cached/pushed in CI.

FROM golang:1.26.5-bookworm AS build

WORKDIR /build

# OCB version pinned to match manifest.yaml's component versions exactly —
# mixing OCB and component versions is a common source of build breakage.
RUN go install go.opentelemetry.io/collector/cmd/builder@v0.157.0

COPY manifest.yaml .
RUN builder --config manifest.yaml

# debug-nonroot, not plain nonroot — pulls in busybox (a real shell +
# wget) specifically so HEALTHCHECK below has something to run. Plain
# distroless has neither, which is fine for the binary itself but leaves
# no way to health-check the running container from the inside.
FROM gcr.io/distroless/base-debian12:debug-nonroot

COPY --from=build /build/dist/starter-otelcol /starter-otelcol
COPY config/collector.yaml /etc/otelcol/collector.yaml

EXPOSE 4317 4318 13133

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/busybox/wget", "--spider", "-q", "http://localhost:13133"]

ENTRYPOINT ["/starter-otelcol"]
CMD ["--config", "/etc/otelcol/collector.yaml"]
