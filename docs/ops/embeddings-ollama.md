# Semantic search for Ayush with a self-hosted embedding model

By default Ayush finds help articles by matching characters and words. That handles
typos and mixed spelling, but not meaning: "fever" and "pyrexia" do not match. Pointing
retrieval at an embedding model fixes that, including across English, Telugu and Hindi.
The model runs on your own server (Ollama), so no text leaves the network.

This changes **how Ayush finds** an article, not **what Ayush says**: answers stay
word-for-word quotes from approved sources.

## Switching it on

1. Start the model server and pull the model once (about 1.2 GB; kept in the
   `ollama-models` volume):

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile embeddings up -d ollama
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec ollama ollama pull bge-m3
   ```

2. Give the backend and the worker these values, then restart them:

   ```sh
   EMBEDDING_PROVIDER=ollama
   EMBEDDING_OLLAMA_URL=http://ollama:11434
   EMBEDDING_MODEL=bge-m3        # the default; multilingual
   ```

   Set `EMBEDDING_OLLAMA_URL`, **not** `OLLAMA_URL`. `OLLAMA_URL` also lets a model
   rephrase Ayush's answers, which is a separate decision.

3. The next index sync re-embeds every approved source with the new model. Check
   Super admin › Knowledge: it shows which embedder is active and whether anything is
   missing from the index.

## If the model is unreachable

Retrieval falls back to the built-in matcher and the admin screen says so. Ayush keeps
answering; nothing fails closed on the student's side.

## Sizing

The service is limited to 2 CPUs and 4 GB of memory and runs without a GPU. That is
enough for embedding help articles and single questions. Measure before relying on it
for more.

## Switching it off

Set `EMBEDDING_PROVIDER=local` (or remove it) and restart. The next sync re-embeds with
the built-in matcher.

## Not verified

The image tag (`ollama/ollama:0.40.6`) and the model name were not pulled or run when
this was written. Start it on a non-production host first.
