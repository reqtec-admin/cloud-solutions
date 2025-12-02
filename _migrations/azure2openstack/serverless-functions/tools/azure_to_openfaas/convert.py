#!/usr/bin/env python3
"""
Lightweight converter that gathers Azure Functions assets and packages them
as an OpenFaaS-friendly bundle.

The script clones / unpacks the source repo, enumerates every directory
with a `function.json`, copies the original files under `functions/<name>/azure`,
and writes a `stack.yml` plus metadata that can later be updated by the migration
team.
"""

import argparse
import json
import logging
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from textwrap import dedent

LOG = logging.getLogger("azure_to_openfaas")

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "node",
    ".ts": "node",
    ".cs": "dotnet",
    ".fs": "dotnet",
    ".csx": "dotnet",
    ".ps1": "powershell",
    ".sh": "bash",
    ".jar": "java",
}
LANGUAGE_TEMPLATE_MAP = {
    "python": "python3",
    "node": "node12",
    "dotnet": "csharp6",
    "powershell": "powershell",
    "bash": "bash",
    "java": "java8",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Package an Azure Functions repo for deployment to OpenFaaS."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--repo-url",
        help="Public Git repository containing the Azure Functions app.",
    )
    group.add_argument(
        "--repo-path",
        type=Path,
        help="Existing local repository root that should be scanned.",
    )
    group.add_argument(
        "--zip-path",
        type=Path,
        help="Zip archive of the Azure Functions repo.",
    )
    group.add_argument(
        "--function-file",
        type=Path,
        help="Single source file to treat as an Azure Function (generates minimal metadata).",
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory to emit the converted bundle (defaults to ./openfaas-azure-export-<timestamp>).",
    )
    parser.add_argument(
        "--output-zip",
        type=Path,
        help="Optional path to write a zipped copy of the bundle (defaults to <output-dir>.zip).",
    )
    parser.add_argument(
        "--registry-prefix",
        help="Optional container registry prefix (e.g. ghcr.io/org/functions).",
    )
    parser.add_argument(
        "--gateway",
        default="http://127.0.0.1:8080",
        help="OpenFaaS gateway address used inside the generated stack.yml.",
    )
    parser.add_argument(
        "--stack-name",
        default="azure-functions",
        help="Logical stack name included in the generated stack.yml.",
    )
    parser.add_argument(
        "--function-name",
        help="Override the Azure Function directory name when using --function-file.",
    )
    parser.add_argument(
        "--function-entry",
        help="Entry point name to emit into the generated function.json (defaults to the function file stem).",
    )
    parser.add_argument(
        "--function-bindings",
        type=json.loads,
        default=None,
        help="JSON array of bindings to use when --function-file is supplied (default []).",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")

    return parser.parse_args()


def slugify(value: str) -> str:
    if not value:
        return "function"
    token = re.sub(r"[^a-z0-9-]+", "-", value.lower())
    token = re.sub(r"-{2,}", "-", token).strip("-")
    return token or "function"


def normalize_repo_root(candidate: Path) -> Path:
    entries = [p for p in candidate.iterdir() if not p.name.startswith(".")]
    if len(entries) == 1 and entries[0].is_dir():
        return normalize_repo_root(entries[0])
    return candidate


def run_git_clone(repo_url: str, target: Path, verbose: bool) -> None:
    cmd = ["git", "clone", "--depth", "1", repo_url, str(target)]
    LOG.info("Cloning %s into %s", repo_url, target)
    kwargs = {"check": True}
    if not verbose:
        kwargs["stdout"] = subprocess.PIPE
        kwargs["stderr"] = subprocess.PIPE
    subprocess.run(cmd, **kwargs)


def prepare_source_dir(args: argparse.Namespace, work_dir: Path) -> Path:
    if args.function_file:
        function_file = args.function_file.expanduser().resolve()
        args.function_file = function_file
        if not function_file.exists():
            raise FileNotFoundError(f"Function file not found: {function_file}")

        bundle_root = work_dir / "function-app"
        bundle_root.mkdir(parents=True, exist_ok=True)
        function_name = args.function_name or function_file.stem
        function_root = bundle_root / function_name
        function_root.mkdir(parents=True, exist_ok=True)
        target_script = function_root / function_file.name
        shutil.copy2(function_file, target_script)

        entry_point = args.function_entry or function_name
        bindings = args.function_bindings if args.function_bindings is not None else []
        function_json = {
            "scriptFile": target_script.name,
            "entryPoint": entry_point,
            "bindings": bindings,
        }

        (function_root / "function.json").write_text(
            json.dumps(function_json, indent=2), encoding="utf-8"
        )
        LOG.info("Staged single function %s from %s", function_name, function_file)
        return bundle_root

    if args.repo_url:
        target = work_dir / "repo"
        run_git_clone(args.repo_url, target, args.verbose)
        return normalize_repo_root(target)

    if args.zip_path:
        zip_path = args.zip_path.expanduser()
        args.zip_path = zip_path
        if not zip_path.exists():
            raise FileNotFoundError(f"Zip archive not found: {zip_path}")
        LOG.info("Extracting %s into %s", zip_path, work_dir)
        with zipfile.ZipFile(args.zip_path, "r") as archive:
            archive.extractall(work_dir)
        return normalize_repo_root(work_dir)

    repo_path = args.repo_path.expanduser().resolve()
    args.repo_path = repo_path
    if not repo_path.exists():
        raise FileNotFoundError(f"Repo path not found: {repo_path}")
    return repo_path


def determine_language(script_file: str | None, function_dir: Path) -> str:
    candidate_ext = None
    if script_file:
        candidate_ext = Path(script_file).suffix.lower()
    else:
        for ext in EXTENSION_LANGUAGE_MAP:
            if any(function_dir.glob(f"*{ext}")):
                candidate_ext = ext
                break
    return EXTENSION_LANGUAGE_MAP.get(candidate_ext, "generic")


def unique_name(base: str, seen: dict[str, int]) -> str:
    base = slugify(base)
    count = seen.get(base, 0)
    seen[base] = count + 1
    return base if count == 0 else f"{base}-{count + 1}"


def find_azure_functions(root: Path) -> list[dict]:
    functions = []
    seen_names: dict[str, int] = {}
    for function_json in root.rglob("function.json"):
        try:
            payload = json.loads(function_json.read_text())
        except json.JSONDecodeError:
            LOG.warning("Skipping invalid JSON at %s", function_json)
            continue

        function_dir = function_json.parent
        relative_path = function_dir.relative_to(root)
        script_file = payload.get("scriptFile")
        entry_point = payload.get("entryPoint")
        language = determine_language(script_file, function_dir)
        faas_name = unique_name(relative_path.name, seen_names)

        functions.append(
            {
                "name": relative_path.name,
                "faas_name": faas_name,
                "relative_path": str(relative_path),
                "script_file": script_file,
                "entry_point": entry_point,
                "language": language,
                "faas_template": LANGUAGE_TEMPLATE_MAP.get(language, "dockerfile"),
                "bindings": payload.get("bindings", []),
            }
        )

    return functions


def copy_functions(functions: list[dict], repo_root: Path, out_root: Path) -> None:
    functions_root = out_root / "functions"
    functions_root.mkdir(parents=True, exist_ok=True)

    for info in functions:
        source = repo_root / info["relative_path"]
        destination = functions_root / info["faas_name"]
        azure_target = destination / "azure"

        LOG.info("Copying Azure function %s -> %s", source, azure_target)
        shutil.copytree(source, azure_target, dirs_exist_ok=True)

        info["azure_path"] = str(azure_target.relative_to(out_root))

        metadata = {
            "name": info["name"],
            "faas_name": info["faas_name"],
            "relative_path": info["relative_path"],
            "script_file": info["script_file"],
            "entry_point": info["entry_point"],
            "language": info["language"],
            "faas_template": info["faas_template"],
            "bindings": info["bindings"],
            "azure_path": info["azure_path"],
        }

        with open(destination / "function-metadata.json", "w", encoding="utf-8") as handle:
            json.dump(metadata, handle, indent=2)

        readme_text = _build_function_readme(info)
        (destination / "README.md").write_text(readme_text, encoding="utf-8")


def _build_function_readme(info: dict) -> str:
    binding_lines = []
    for binding in info["bindings"]:
        name = binding.get("name", "<unknown>")
        btype = binding.get("type", "<unknown>")
        direction = binding.get("direction", "<unknown>")
        binding_lines.append(f"- `{name}` :: {btype} ({direction})")

    if not binding_lines:
        binding_lines.append("- None detected")

    header = dedent(
        f"""
        # {info['faas_name']}

        Original Azure path: `{info['relative_path']}`
        Script file: `{info['script_file'] or '<not declared>'}`
        Entry point: `{info['entry_point'] or 'default'}`
        Language hint: `{info['language']}`
        Bindings:
        """
    ).strip()

    readme = [
        header,
        "\n".join(binding_lines),
        "",
        "## Next steps",
        "",
        "1. Review the original Azure sources in `azure/` and relocate "
        "the business logic into an OpenFaaS handler (e.g. `handler.py` or `index.js`).",
        f"2. Use `faas-cli new {info['faas_name']} --lang {info['faas_template']}` "
        "to scaffold the FaaS handler if you need boilerplate.",
        "3. Update the generated `stack.yml` (root of this bundle) and set the "
        "desired image/repository before running `faas-cli build` / `push` / `deploy`.",
        "",
        "## Suggested layout",
        "",
        "- `azure/` contains the original Azure Function project for reference.",
        "- Add your production handler(s) beside `azure/` (e.g. `handler.py`).",
        "- Track dependencies inside `requirements.txt`, `package.json`, etc. as required.",
        "",
        "Copy and adapt the code you need and consult the root README for overall guidance.",
    ]

    return "\n".join(readme)


def write_stack_yaml(
    functions: list[dict],
    out_root: Path,
    registry_prefix: str | None,
    gateway: str,
    stack_name: str,
) -> None:
    stack_path = out_root / "stack.yml"
    prefix = registry_prefix.rstrip("/") if registry_prefix else ""
    lines = [
        f"# Generated stack: {stack_name}",
        "provider:",
        "  name: openfaas",
        f"  gateway: {gateway}",
        "functions:",
    ]

    for info in functions:
        lines.append(f"  {info['faas_name']}:")
        lines.append(f"    lang: {info['faas_template']}")
        lines.append(f"    handler: ./functions/{info['faas_name']}")
        image = f"{prefix}/{info['faas_name']}:latest" if prefix else f"{info['faas_name']}:latest"
        lines.append(f"    image: {image}")
        lines.append("    annotations:")
        lines.append(f"      azure-path: '{info['relative_path']}'")
        bindings_json = json.dumps(info["bindings"], separators=(",", ":"))
        lines.append(f"      azure-bindings: '{bindings_json}'")
        lines.append("")

    stack_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_manifest(
    functions: list[dict],
    out_root: Path,
    source_label: str,
    gateway: str,
) -> None:
    manifest = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source": source_label,
        "gateway": gateway,
        "function_count": len(functions),
        "functions": [
            {
                "name": info["name"],
                "faas_name": info["faas_name"],
                "relative_path": info["relative_path"],
                "script_file": info["script_file"],
                "entry_point": info["entry_point"],
                "language": info["language"],
                "faas_template": info["faas_template"],
                "azure_path": info.get("azure_path"),
            }
            for info in functions
        ],
    }

    (out_root / "function-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )


def write_root_readme(out_root: Path, stack_name: str, gateway: str) -> None:
    readme = dedent(
        f"""
        # OpenFaaS Migration Bundle

        This bundle was generated by `azure_to_openfaas/convert.py` and contains:

        - `stack.yml` – OpenFaaS stack with one entry per Azure Function.
        - `functions/` – directories that mirror each Azure Function directory plus metadata.
        - `function-manifest.json` – summary helpful for automation or reporting.

        ## Usage

        1. Review the Azure source code inside `functions/<function>/azure/`.
        2. Implement an OpenFaaS handler (Python, Node, etc.) beside the `azure/` folder.
        3. Adjust the generated `stack.yml` image names, environment, or annotations.
        4. Build/push/deploy with `faas-cli`:

           ```bash
           faas-cli build -f stack.yml --gateway {gateway}
           faas-cli push -f stack.yml --gateway {gateway}
           faas-cli deploy -f stack.yml --gateway {gateway}
           ```

        5. Optionally, keep this bundle for traceability and share the zipped archive with operators.
        """
    )
    (out_root / "README.md").write_text(readme.strip() + "\n", encoding="utf-8")


def bundle_to_zip(out_root: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()

    LOG.info("Creating zip archive %s", zip_path)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for item in out_root.rglob("*"):
            archive.write(item, item.relative_to(out_root))


def main() -> None:
    args = parse_args()
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s: %(message)s")
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

    with tempfile.TemporaryDirectory() as temp_dir:
        work_dir = Path(temp_dir)
        try:
            source_root = prepare_source_dir(args, work_dir)
        except Exception as exc:
            LOG.error("Unable to prepare source: %s", exc)
            sys.exit(1)

        functions = find_azure_functions(source_root)

        if not functions:
            LOG.warning("No Azure functions detected under %s", source_root)

        output_root = (
            args.output_dir.expanduser().resolve()
            if args.output_dir
            else Path.cwd() / f"openfaas-azure-export-{timestamp}"
        )

        if output_root.exists():
            LOG.error("Output directory %s already exists", output_root)
            sys.exit(1)

        output_root.mkdir(parents=True, exist_ok=False)

        copy_functions(functions, source_root, output_root)

        source_label = args.repo_url or (str(args.zip_path) if args.zip_path else str(args.repo_path))

        write_stack_yaml(
            functions,
            output_root,
            args.registry_prefix,
            args.gateway,
            args.stack_name,
        )
        write_manifest(functions, output_root, source_label, args.gateway)
        write_root_readme(output_root, args.stack_name, args.gateway)

        output_zip = (
            args.output_zip.expanduser().resolve()
            if args.output_zip
            else output_root.with_suffix(".zip")
        )
        if output_zip == output_root:
            output_zip = output_root.parent / f"{output_root.name}.zip"

        bundle_to_zip(output_root, output_zip)

        LOG.info("Bundle ready at %s", output_root)
        LOG.info("Zipped export written to %s", output_zip)


if __name__ == "__main__":
    main()

