# Multi-stage build for C++ Simulation Engine
FROM gcc:12 AS builder

RUN apt-get update && apt-get install -y cmake build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN mkdir -p build && cd build && cmake .. && cmake --build . -j4

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/build/mini_os_backend /app/mini_os_backend
EXPOSE 8080
ENV PORT=8080
CMD ["/app/mini_os_backend", "8080"]
