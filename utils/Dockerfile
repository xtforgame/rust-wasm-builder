FROM ubuntu:16.04 as curl
RUN apt-get update && apt-get install -y curl libssl-dev pkg-config rsync

FROM curl as node
WORKDIR /node
RUN curl https://nodejs.org/dist/v8.6.0/node-v8.6.0-linux-x64.tar.gz | \
  tar xzf - --strip-components=1
RUN rm -rf node/share
RUN rm -rf node/include

FROM curl as rust
WORKDIR /rust
ENV HOME=/rust
RUN curl https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.34.0
ENV PATH=$PATH:$HOME/.cargo/bin
RUN rm -rf $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/share
RUN rustup target add wasm32-unknown-unknown
RUN rustup component add rustfmt-preview
RUN apt-get install -y gcc file make
RUN CARGO_TARGET_DIR=/tmp/cargo cargo install wasm-bindgen-cli --version 0.2.45
RUN CARGO_TARGET_DIR=/tmp/cargo cargo install wasm-gc
WORKDIR /tmp/wbg
COPY Cargo.toml .
COPY utils/blank.rs utils/blank.rs
RUN CARGO_TARGET_DIR=/rust/wasm-bindgen cargo build --release --target wasm32-unknown-unknown

# Minimize the size of this rust installation
# RUN rm -rf $HOME/.cargo/registry
# RUN strip -g $HOME/.cargo/bin/*
# RUN rm $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/bin/rust-gdb
# RUN rm $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/bin/rust-lldb
# # RUN strip -g $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/bin/*
# # RUN strip -g $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/**/*.so
# # RUN strip -g $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/bin/*
# RUN rm $HOME/.rustup/toolchains/1.34.0-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/codegen-backends/*emscripten*

FROM curl
COPY --from=rust /rust /app
COPY --from=node /node /app/node
COPY ./app /app
WORKDIR /app
ENV PATH=$PATH:/app/.cargo/bin:/app/node/bin
ENV RUSTUP_HOME=/app/.rustup
ENV CARGO_HOME=/app/.cargo
ENV HOME=/app

CMD ["node", "."]
# CMD ["ls", "-al", "/app"]
# RUN tar czvf slug.tgz ./app
