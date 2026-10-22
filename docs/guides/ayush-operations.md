# Running Agent Ayush

Ayush is the "Ask" assistant. It answers questions about how StudentKare works, only by quoting
approved sources, and shows which source each answer came from. This guide is for whoever runs the
servers and for the clinical team. How the pipeline works is in the RAG write-up; this is the how-to.

Safety layers that are always on, whatever you configure here: the crisis gate runs first and shows
helplines (112, Tele-MANAS 14416); diagnosis, prescribing and dose questions are refused; questions
about the student's own results are refused (Ayush never reads records); every answer carries
citations; a model, when one is on, may only rephrase the retrieved passages and is checked for that.

## 1. What "working" looks like

Open **Super admin › Knowledge**. The **Ayush health** card says, in plain words:

| Line | What it means | What to do if it's wrong |
|---|---|---|
| Status pill | **Answering**, **Needs a look**, or **Not answering** (no indexed source, so every question gets "I couldn't find this in StudentKare's help yet"). | See below. |
| Sources published / indexed | Approved, unexpired sources, and how many are searchable. Should be equal. | Publishing indexes in the same request; the knowledge job (every 2 hours) and every restart repair anything missed. **Rebuild index** forces a full rebuild. |
| StudentKare help articles live | The help pack (section 2). Normally "19 of 19". | Load the help pack. |
| How Ayush finds sources | **Keyword matching** (default), **Semantic search · model**, or **Semantic model not answering** (some passages fell back to keywords). | Section 3. |
| How Ayush answers | **Quotes the source word for word** (no model) or **Rephrased by the on-prem model · model**. | Section 4. |
| Model server | Reachable / not reachable / model not pulled (only when a model is configured). | Start Ollama, `ollama pull <model>`. |
| Last answers | Of the last 50 answers: rephrased, quoted, fell back to quotes. Many fallbacks = the model is slow, down, or its rephrasing failed the grounding check. | Check the model, or turn it off. |
| Last error | The last model-runtime failure in this server process (stage and error type, never text). | Usually the model server. |

The same data as JSON: `GET /api/ops/agents/ayush/health` (super admin).

## 2. The help pack (product help, not clinical)

Nineteen articles about how StudentKare works live in `backend/content/ayush_help/*.md`: booking a
consult, medicines, lab tests, prescriptions, orders and returns, emergency card, SOS, crisis numbers,
privacy, consent and sharing, deleting your account, plans and prices, campus verification, Find care,
Medicine info, steps/water/reminders, sign-in and passcode, getting help and support, and what Ayush
can do. Each one names, in a comment, the screens and endpoints it was written from. Prices and limits
are written as `{{setting:key}}` and filled from the settings registry when published, so they always
match what the server charges.

Each article's header can carry `keywords:`, the words and phrases students use for its topic
("talk to a doctor", "otp not received", Hinglish "dawai"). They are never published or quoted; they
only help retrieval find the article. Write each paragraph of an article about one thing: Ayush quotes
the paragraph that answers the question, not the whole article.

**Check a change against the gold set.** `backend/tests/data/ayush_eval_set.json` holds the questions
students ask (English, Hinglish, Hindi, Telugu, typos, out-of-scope, clinical, own-record, crisis,
injection) with the outcome and article each must get. `backend/tests/test_ayush_eval.py` runs them
through Ayush with the pack loaded and fails CI if a refusal or crisis phrase regresses or retrieval
falls below its floors:

```bash
cd backend && python -m pytest tests/test_ayush_eval.py -q -s -p no:cacheprovider
```

**It loads itself.** On every start the API publishes the pack (category *Product help*, reviewed,
versioned) and indexes it. A changed article is published as the next version; an unchanged one is
left alone. To turn that off, set `AYUSH_HELP_PACK_AUTOLOAD=false`.

**By hand** (for example after changing a price override, or with autoload off), on the server with
the app's environment:

```bash
# Check the articles only (writes nothing)
python backend/scripts/load_help_pack.py --check
# Publish / update and re-index
python backend/scripts/load_help_pack.py --confirm
# In Docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  python scripts/load_help_pack.py --confirm
```

The command is idempotent. It never overwrites an article an admin edited or unpublished in the
Knowledge screen; `--force` restores the pack's text for those. Deleting a file from the folder
unpublishes that article at the next load. Each article expires a year after the `reviewed:` date in
its header; the knowledge freshness job lists what is expiring. To update the pack, edit the files in
a pull request (product help only, written from what the code does) and bump `reviewed:`.

## 3. Semantic retrieval (optional, on-prem)

By default Ayush matches on words (a local, dependency-free embedder), with the help pack's keywords
and typo correction. It finds "book a consult", "see a doctor" and "doctor appointment kaise book
kare", but not a question typed in Hindi or Telugu script. A multilingual embedding model on
your own Ollama fixes that. Never point these at a cloud API (Rule-C): the student's question is sent
to it, after the guardrail masks emails, phone numbers, Aadhaar, ABHA numbers and addresses, and roll
numbers.

```bash
# On the model host (GPU optional for embeddings)
ollama pull bge-m3            # multilingual, recommended
# or: ollama pull nomic-embed-text   (English only, smaller)
```

Backend environment:

| Variable | Value |
|---|---|
| `EMBEDDING_PROVIDER` | `ollama` (anything else, or unset, = keyword matching) |
| `EMBEDDING_MODEL` | `bge-m3` (default) or another Ollama embedding model |
| `OLLAMA_URL` | e.g. `http://ollama:11434` (the same Ollama as the answer model) |
| `EMBEDDING_OLLAMA_URL` | only if embeddings run on a different Ollama |
| `EMBEDDING_TIMEOUT_SECONDS` | default 8 |

Restart the backend. At startup every source is re-embedded with the new model (the index stores which
model made each vector, so a change of provider or model re-embeds automatically). If the model is
unreachable, sources are indexed for keyword matching instead, the card says **Semantic model not
answering**, and the next sync (restart or the knowledge job) re-embeds them.

With a semantic model, a passage that shares no word with the question is admitted only above the
`ayush.semantic_admit_similarity` setting (default 0.8, deliberately strict). Calibrate it for your
model before lowering it: ask 20 real questions, including Hindi/Telugu ones, and check the citations.
Change it in **Settings** (reason required, audited).

In every mode a passage must hold the `ayush.min_term_overlap` share of the question's subject words
(default 0.5; title and help-pack keywords count, a typo counts a little less, a word that is in no
article counts double against it). Lower it and off-topic questions ("cricket score today") start
getting answers; raise it and paraphrases stop finding their article. Re-run the gold set after a change.

Vectors are stored as JSON in `care_knowledge_chunks` and searched in Python. That is fine for
hundreds of sources. pgvector is not used yet: it needs the extension on the production Postgres, a
migration of the `vector` column, and an ANN index; worth doing past a few thousand chunks.

## 4. Rephrased answers (optional, on-prem)

Without a model, Ayush quotes the best passage word for word. With one, the model may only rephrase the
retrieved passages; the answer is accepted only if every number and sentence is supported by the
passages and negation is kept, otherwise Ayush quotes.

```bash
ollama pull llama3.1:8b
```

| Variable | Value |
|---|---|
| `OLLAMA_URL` | e.g. `http://ollama:11434` |
| `LLM_MODEL` | default `llama3.1:8b` |
| `LLM_TIMEOUT_SECONDS` | default 8; after a failure the gateway waits `LLM_RETRY_AFTER_SECONDS` (30) before trying again |

These variables are passed to the container by `docker-compose.prod.yml` and the Helm chart
(`backend.env.*` in `values/production.yaml`). Setting them on the host alone is not enough with
other deployment files: check the health card after a restart.

## 5. How the clinical team adds articles

Clinical topics (what a fever means, when to see a doctor) are **not** in the help pack. They are
written and owned by the clinical team:

1. Sign in as a super admin, open **Super admin › Knowledge**, choose **Add source**.
2. Give it a title, a category, the text (up to 4,000 characters; short plain sentences retrieve and
   quote best), the author, and how many days it stays valid.
3. **Publish.** It is indexed in the same request: Ayush can cite it straight away. The health card
   shows "indexed N of N".
4. To change or withdraw it (API today; the screen has no edit button yet):
   `PATCH /api/ops/knowledge/{id}` with any of `title`, `category`, `content`, `expiresInDays`
   (a text change is the next version, re-indexed at once), `POST /api/ops/knowledge/{id}/unpublish`,
   `POST /api/ops/knowledge/{id}/restore`.

Publishing marks a source reviewed by the super admin who publishes it. There is no second-reviewer
or clinician sign-off step yet; agree inside the clinical team who reviews before publishing.

Ayush will still refuse diagnosis, prescribing and dosing questions even when an article covers the
topic, and still refuses to interpret a student's own results.
