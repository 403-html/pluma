# Scaling Pluma

The `api` service is stateless — run multiple replicas behind nginx; Docker DNS
handles discovery automatically.

## nginx.conf

```nginx
events {}

http {
  resolver 127.0.0.11 valid=30s; # Docker embedded DNS

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

## docker-compose.yml

Remove `ports` from the `api` service, add `deploy.replicas`, and add an `nginx`
service:

```yaml
api:
  image: ghcr.io/403-html/pluma-api:latest
  environment:
    DATABASE_URL: postgresql://${DB_USER:-pluma}:${DB_PASSWORD:-pluma}@db:5432/${DB_NAME:-pluma}?schema=public
  depends_on:
    db:
      condition: service_healthy
  deploy:
    replicas: 3

nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - api
```

## Scaling

```bash
docker compose up -d --scale api=N
```

## Verify

```bash
docker compose exec nginx nslookup api
```
