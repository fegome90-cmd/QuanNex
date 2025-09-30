FROM debian:stable-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LC_ALL=C.UTF-8 \
    LANG=C.UTF-8 \
    LANGUAGE=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git jq ripgrep shellcheck \
    make coreutils procps findutils sed gawk grep \
    && rm -rf /var/lib/apt/lists/*

# shfmt y bats-core (opcional): se pueden añadir según políticas internas
# RUN curl -L https://.../shfmt -o /usr/local/bin/shfmt && chmod +x /usr/local/bin/shfmt
# RUN git clone --depth 1 https://github.com/bats-core/bats-core /opt/bats && /opt/bats/install.sh /usr/local

WORKDIR /workspace

CMD ["bash"]

