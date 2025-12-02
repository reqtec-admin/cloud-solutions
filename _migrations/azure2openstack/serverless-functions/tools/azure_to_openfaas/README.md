# Azure to OpenFaaS Bundle Generator

This helper script creates a mechanical bundle that makes it easier to move
an Azure Functions app into OpenFaaS. The bundle copies the original
function directories, generates a `stack.yml`, and produces metadata so that
a migration engineer can update or extend each handler.

## Requirements

- Python 3.10 or newer
- `git` (only if you supply `--repo-url`)

## Usage

1. Clone this workspace (if you have not already) and run the converter:

   ```bash
   python tools/azure_to_openfaas/convert.py \
     --repo-url https://github.com/example/azure-functions-app \
     --registry-prefix ghcr.io/myorg/functions \
     --output-dir /tmp/openfaas-export \
     --output-zip /tmp/openfaas-export.zip
   ```

2. The tool will produce:

   * `/tmp/openfaas-export/stack.yml` – an OpenFaaS stack with one function per Azure entry point.
   * `/tmp/openfaas-export/functions/<function>/azure/` – the original Azure function payload.
   * `/tmp/openfaas-export/function-manifest.json` – a simple summary you can consume.
   * `/tmp/openfaas-export/functions/<function>/README.md` – per-function guidance on finishing the migration.

3. The zipped archive mirrors the folder layout and can be sent to your delivery or ops team.

4. After the bundle is created:

   * Add an OpenFaaS handler (Python, Node, etc.) next to the `azure/` directory for each function.
   * Adjust image names, environment variables, and secrets inside `stack.yml`.
   * Use `faas-cli build`, `push`, and `deploy` with the generated `stack.yml`.

## Additional flags

- `--zip-path` – skip `--output-zip` (defaults to `<output-dir>.zip`).
- `--gateway` – modify the gateway URL embedded in `stack.yml`.
- `--stack-name` – change the logical stack name that appears in the comment at the top of `stack.yml`.
- `--verbose` – see debug logs from the bundler.

This tool only re-organizes the Azure source into an OpenFaaS-friendly shape; it does not rewrite your business logic.

