# Scaling Pluma

## Overview

Pluma's API is stateless — each request is fully self-contained and no session
state is stored in the process. This means you can run multiple `api` replicas
simultaneously without any coordination layer between them.

The recommended horizontal-scaling strategy is: add multiple `api` replicas,
place an nginx reverse proxy in front of them, and let Docker's embedded DNS
handle replica discovery. No external service registry or sidecar is needed.

## How Docker's DNS Works

Docker Compose assigns a virtual DNS name equal to the service name (e.g.,
`api`). When multiple replicas run under the same service, Docker's embedded DNS
resolver (`127.0.0.11`) returns the IP addresses of **all** running containers
for that name. nginx queries this resolver and distributes traffic across every
address it receives, so replicas are load-balanced automatically without any
manual registration step.

## Nginx Configuration

Below is a conceptual `nginx.conf` that wires up Docker DNS-based load
balancing. **This is an example — adapt it for TLS, timeouts, rate limiting, and
your own deployment requirements before using in production.**

```nginx
http {
  # Use Docker's embedded DNS resolver.
  # Re-resolve every 30 s so newly started replicas are picked up automatically.
  resolver 127.0.0.11 valid=30s;

  upstream api_backend {
    server api:2137;
  }

  server {
    listen 80;

    location / {
      proxy_pass         http://api_backend;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }
  }
}
```

## Production docker-compose Changes

Starting from the production `docker-compose.yml` in the README, make the
following changes:

### `api` service — remove `ports`, add `deploy.replicas`

```yaml
# BEFORE
api:
  image: ghcr.io/403-html/pluma-api:latest
  ports:
    - "2137:2137" # remove — nginx handles external traffic
  environment:
    DATABASE_URL: postgresql://${DB_USER:-pluma}:${DB_PASSWORD:-pluma}@db:5432/${DB_NAME:-pluma}?schema=public
  depends_on:
    db:
      condition: service_healthy

# AFTER
api:
  image: ghcr.io/403-html/pluma-api:latest
  # ports block removed — API is no longer exposed directly
  environment:
    DATABASE_URL: postgresql://${DB_USER:-pluma}:${DB_PASSWORD:-pluma}@db:5432/${DB_NAME:-pluma}?schema=public
  depends_on:
    db:
      condition: service_healthy
  deploy:
    replicas: 3 # adjust to match your load
```

### Add an `nginx` service

```yaml
# ADD this new service
nginx:
  image: nginx:alpine
  ports:
    - "80:80" # add "443:443" here when terminating TLS
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - api
```

### `app` service — no changes required

The `app` service keeps `API_URL: http://api:2137`. Docker DNS still
load-balances traffic from `app` to `api` transparently, so no update is needed
here.

## Scaling Up and Down

```bash
# Scale to N api replicas at runtime
docker compose up -d --scale api=N
```

Alternatively, edit `replicas` in the `deploy` block of your
`docker-compose.yml` and run `docker compose up -d` to apply the change.

## Notes and Caveats

- **Database is a single node.** Only the stateless `api` layer should be scaled
  horizontally. Do not attempt to run multiple `db` replicas with this setup.
- **`app` (Next.js) is also stateless** and can be scaled the same way using a
  second nginx upstream block or a separate load balancer, but is typically run
  as a single instance.
- **HTTPS:** terminate TLS at nginx and forward plain HTTP to `api` internally.
  Add a `443` port mapping to the `nginx` service and configure SSL certificates
  in `nginx.conf`.
- **DNS re-resolution:** nginx resolves `api` at startup and then re-resolves
  every `valid=` seconds (30 s in the example above). Replicas added after
  startup are picked up automatically within that window.
