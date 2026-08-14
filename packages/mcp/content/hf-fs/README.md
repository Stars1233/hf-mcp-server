# Hugging Face virtual filesystem

Use `hf://` URIs to browse Hugging Face resources:

- `hf://models`
- `hf://datasets`
- `hf://spaces`
- `hf://buckets`
- `hf://collections`
- `hf://papers`
- `hf://docs`

The `hf_fs` tool supports six operations:

- `ls` lists direct children, or bounded descendants with `--recursive`.
- `cat` reads a text or JSON file with `--offset` and `--max-bytes`.
- `attach` returns one complete JPEG, PNG, or WebP repository or bucket file as MCP image content.
- `stat` inspects one URI.
- `find` traverses descendants beneath one known resource.
- `search` performs API-backed discovery beneath a supported discovery root.

Use `search` for global discovery and `find` for local traversal. Global recursive crawling is intentionally unsupported.

Entries use canonical `hf://` identities. A link has a local `uri` and an authoritative `target_uri`. Directly addressing a supported link resolves to its target, while recursive traversal does not follow links.

Public resources work anonymously. Private or gated resources require a Hugging Face token with access.

## Safe workflow and operation scope

Discover before access: use `search`, `ls`, or `find` to locate a target, and use `stat` when its type is uncertain.
Reuse the returned `uri` verbatim, or the `target_uri` for a link. Do not invent repository paths.

`cat` reads confirmed UTF-8 text files only. It rejects repositories, directories, model weights, archives, images,
media, Parquet, and other binary content. Use `stat` for metadata or `ls` on the parent directory.

`attach URI [--max-bytes N]` accepts exactly one direct repository or bucket file URI. Supported extensions are
`.jpg`, `.jpeg`, `.png`, and `.webp`, matched case-insensitively. Classification uses only the extension: bytes are
opaque, are never inspected or altered before MCP encoding, and the complete file is returned or rejected without
truncation.

| Goal or scope | Use |
|---|---|
| Global repository, collection, documentation, paper, or Space discovery | `search` |
| Recursive name/path matching inside an owner namespace, repository, or docs scope | `find` |
| Inspect an uncertain target type or binary-file metadata | `stat` |
| Read a confirmed UTF-8 text file | `cat` |
| Return a supported image file to the model | `attach` |
| Sort an owner namespace or supported collection listing | `ls --sort` |
| Browse globally trending repositories | `ls hf://models/trending`, `hf://datasets/trending`, or `hf://spaces/trending` |
| List repository files or documentation | `ls` without `--sort` |

## Limits

| Command | Default | Maximum |
|---|---:|---:|
| General `ls` and `find` | 1,000 | 10,000 |
| `search` | 100 | 1,000 |
| Documentation `search` | 5 | 25 |
| `ls hf://models/trending` | 20 | 20 |
| `ls hf://datasets/trending` | 20 | 20 |
| `ls hf://spaces/trending` | 20 | 20 |
| `cat --max-bytes` | 20,000 bytes | 80,000 bytes |
| `attach --max-bytes` | 4 MiB | 4 MiB |

Paper listings have provider-specific limits, generally 100 entries. Use `--limit` only when the request calls for a cap or exhaustive results.

## Examples

```text
ls hf://models/openai --sort downloads --limit 20
ls hf://datasets/OWNER/NAME --recursive --glob **/*.json
find hf://spaces/OWNER/NAME --name app.py --type file
cat hf://models/OWNER/NAME/README.md --offset 20000 --max-bytes 20000
attach hf://datasets/OWNER/NAME/images/example.png
search hf://datasets "speech recognition" --sort downloads --limit 20
ls hf://spaces/trending
ls hf://docs/diffusers
search hf://docs/transformers "loading a pretrained model"
```

The MCP input keeps each token separate. For example:

```json
{"cmd":"find","args":["hf://spaces/OWNER/NAME","--name","app.py","--type","file"]}
```

## Writes

Authenticated servers can expose `hf_fs_write` with the same command-and-arguments convention. `put` receives file
data separately in `content`; use `--base64` for binary data.

```json
{"cmd":"put","args":["hf://models/OWNER/NAME/README.md","--message","Update README"],"content":"# Model"}
{"cmd":"rm","args":["hf://datasets/OWNER/NAME/old.json","--create-pr","--message","Remove stale data"]}
```

Repository writes support `--branch`, `--create-pr`, `--description`, and `--parent-commit SHA`. Use `--create-pr`
when proposing a change to a repository you cannot or should not modify directly. Buckets do not support commit or
pull-request options.

## Trending repositories

The `models`, `datasets`, and `spaces` roots each expose a virtual `trending` directory. These directories return at most 20 entries from the Hugging Face trending feed. `--sort trending` and `--sort trendingScore` are accepted but redundant because the path already determines the order.

## Papers

- Search by topic: `search hf://papers "vision language models"`
- Inspect a paper: `hf://papers/2502.16161`
- Read full text: `hf://papers/2502.16161/paper.md`
- Current Daily Papers: `hf://papers/daily/latest`
- Dated batch: `hf://papers/daily/YYYY/MM/DD`
- Current global ranking: `hf://papers/trending`

See [`hf://papers/README.md`](hf://papers/README.md) for details.

## Documentation

`hf://docs` exposes products with a current `llms.txt` manifest. Manifest paths are authoritative and include the
current release version:

```text
ls hf://docs/diffusers
cat hf://docs/diffusers/v0.39.0/quicktour.md
find hf://docs/transformers --path "*/main_classes/*.md"
search hf://docs/peft "adapter injection"
search hf://docs/transformers/v5.13.1/internal "TextIteratorStreamer"
cat hf://docs/transformers/v5.13.1/internal/generation_utils.md#transformers.TextIteratorStreamer
```

`ls hf://docs` lists products. Search any product, version, directory, or document scope, and use returned `hf://`
URIs verbatim. Documentation manifests are cached for ten minutes. Reads are restricted to files in the current
manifest; anchored reads return a best-effort bounded section.

## Sandboxes

For complicated or intensive filesystem operations mount the required repositories in a Sandbox and use shell or Python to programatically inspect them.
