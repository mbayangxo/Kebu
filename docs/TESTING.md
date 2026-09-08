# Testing

**CI gate chain:** [CI_PIPELINE.md](./CI_PIPELINE.md) — failure stops deployment.

**Detail:** [testing/README.md](./testing/README.md) · [product/TESTING.md](./product/TESTING.md)

```bash
npm run ci    # all required gates in order
```

Nothing is **built** until tests prove the full path works.
