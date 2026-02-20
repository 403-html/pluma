# Security Best Practices

Guidelines for securing Pluma in production deployments.

## Secrets Management

### Development

`.env` files with defaults are acceptable for local development.

### Production

**Do NOT use `.env` files committed to version control.** Instead, use:

#### Docker Swarm

Use [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/):

```bash
echo "strong_password" | docker secret create postgres_password -
```

Example `docker-compose.prod.yml` with secrets:
```yaml
# docker-compose.prod.yml (excerpt)
services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    external: true
```

#### Kubernetes

Use [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pluma-db-credentials
type: Opaque
data:
  password: <base64-encoded-password>
```

#### Cloud Providers

- **AWS**: [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) or [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- **Azure**: [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault)
- **GCP**: [Secret Manager](https://cloud.google.com/secret-manager)

#### Docker Compose Override

Use environment-specific compose files for secrets:

```yaml
# docker-compose.secrets.yml (add to .gitignore)
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # From secure env var injection
```

**Important**: Add `docker-compose.secrets.yml` to `.gitignore` and never commit this file. Use it locally or in deployment pipelines only.

## Password Generation

Generate cryptographically secure passwords:

```bash
# PostgreSQL password (32 bytes = 44 base64 chars)
openssl rand -base64 32

# Or use pwgen if available
pwgen -s 32 1
```

**Important**: Save the generated password immediately in your password manager or secrets vault - running the command again produces a different password.

## DATABASE_URL Security

`DATABASE_URL` embeds credentials as plaintext in the connection string environment variable. For enhanced security in production:

- Use Docker secrets (example above) instead of environment variables
- Or inject credentials at runtime from a secrets manager
- Avoid logging `DATABASE_URL` or exposing it via container inspection

## Container Security Checklist

- ✅ **Non-root users**: All services run as non-root (implemented)
- ✅ **Read-only filesystems**: Consider adding `read_only: true` with tmpfs mounts
- ✅ **Resource limits**: Add CPU/memory limits in production
- ✅ **Network policies**: Restrict inter-container communication
- ✅ **Image scanning**: Run `docker scan` or Trivy on built images

## Additional Recommendations

1. **Rotate credentials regularly** - especially API tokens and database passwords
2. **Use TLS/SSL** - encrypt connections between services and clients
3. **Enable audit logging** - track access to sensitive operations
4. **Apply principle of least privilege** - limit permissions to minimum required
5. **Keep dependencies updated** - regularly update base images and packages
