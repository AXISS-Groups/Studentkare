# Keep PostgreSQL 16 + Alpine/musl so existing postgres-data volumes retain
# their major version and libc/collation family. Install the server extension;
# the application migration creates it in each database.
FROM postgres:16-alpine@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139

ARG PGVECTOR_VERSION=0.8.1
ARG PGVECTOR_SHA256=a9094dfb85ccdde3cbb295f1086d4c71a20db1d26bf1d6c39f07a7d164033eb4

RUN apk add --no-cache --virtual .pgvector-build build-base \
    && wget -O /tmp/pgvector.tar.gz "https://codeload.github.com/pgvector/pgvector/tar.gz/refs/tags/v${PGVECTOR_VERSION}" \
    && echo "${PGVECTOR_SHA256}  /tmp/pgvector.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" with_llvm=no OPTFLAGS="" \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" with_llvm=no OPTFLAGS="" install \
    && rm -rf /tmp/pgvector.tar.gz "/tmp/pgvector-${PGVECTOR_VERSION}" \
    && apk del .pgvector-build
