<div align="center">

[![CI](https://github.com/403-html/pluma/actions/workflows/ci.yml/badge.svg)](https://github.com/403-html/pluma/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/github/v/release/403-html/pluma?label=docker)](https://github.com/403-html/pluma/releases)
[![SDK](https://img.shields.io/npm/v/%40pluma-flags%2Fsdk?label=sdk)](https://www.npmjs.com/package/@pluma-flags/sdk)

<img width="4030" height="1766" alt="Pluma header" src="https://github.com/user-attachments/assets/c2128faa-3d60-44de-a4f1-60384660fcb3" />

<p align="center">Self-hosted feature flag system. Manage flags via a web UI and evaluate them in your application with a lightweight SDK.</p>

<p align="center"><em>Pluma (Spanish: feather) — lightweight by design.</em></p>

</div>

---

## Quick start

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

- **UI** → [http://localhost:3000](http://localhost:3000)
- **API** → [http://localhost:2137](http://localhost:2137)

```bash
npm install @pluma-flags/sdk
```

```ts
const client = PlumaSnapshotCache.create({ baseUrl, token });
const evaluator = await client.evaluator({ subjectKey: "user-123" });
evaluator.isEnabled("my-feature");
```

## Documentation

📖 **[pluma.to](https://pluma.to)** — getting started, SDK reference,
architecture, scaling, and more.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

If Pluma is useful to you, consider
[buying a coffee ☕](https://ko-fi.com/403html).

## License

Apache 2.0, see [LICENSE](LICENSE).
