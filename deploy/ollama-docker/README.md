# Run Ollama locally (docker)

This directory contains a minimal `docker-compose.yml` and a helper script to run an Ollama daemon locally on port `11434`.

The Docker image `ollama/ollama:latest` is available on Docker Hub and can be used for this local daemon.

Quick start (requires Docker / Docker Compose):

```bash
# from repository root
cd deploy/ollama-docker
docker compose up -d
```

Or use the helper script:

```bash
cd deploy/ollama-docker
./start-ollama.sh start
```

Check health with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:11434/api/tags
```

If the service responds `200`, update your project's `.env`:

```
OLLAMA_API_URL=http://localhost:11434
OLLAMA_FORCE_OFFLINE=false
```

Then restart the backend to pick up the new env:

```bash
pm2 restart hospital-backend --update-env
```

If you prefer not to use Docker, use native installation instead (see below).

Native installation (Ubuntu/Debian)
---------------------------------
1. Download the official Ollama Linux package or follow the official instructions from the Ollama website.
2. Extract/install the daemon and ensure the `ollama` binary is executable and on your PATH.
3. Start the Ollama daemon (example):

```bash
# adjust to the official binary/service commands from the provider
ollama daemon start --port 11434
```

4. Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:11434/api/tags
```

If successful, set `OLLAMA_API_URL` and `OLLAMA_FORCE_OFFLINE=false` and restart the backend.

If you want, I can try to `docker pull ollama/ollama:latest` here to confirm availability and start it for you — tell me to proceed and I will pull and run it.
