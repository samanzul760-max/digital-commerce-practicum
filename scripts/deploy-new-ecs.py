#!/usr/bin/env python3
from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import os
import pathlib
import posixpath
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from typing import Iterable

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


DEFAULT_HOST = "47.112.10.126"
DEFAULT_USER = "root"
DEFAULT_REMOTE_DIR = "/opt/digital-commerce-practicum"
DEFAULT_PM2_NAME = "digital-commerce-practicum"

EXCLUDE_DIRS = {
    ".data",
    ".git",
    "node_modules",
    ".nuxt",
    ".output",
    "test-results",
    "playwright-report",
    ".playwright-cli",
    "output",
    "__pycache__",
}

EXCLUDE_SUFFIXES = {".zip"}


def ensure_paramiko():
    try:
      import paramiko  # noqa: F401
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "paramiko"])


ensure_paramiko()
import paramiko  # type: ignore  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy digital-commerce-practicum to the new ECS.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--user", default=DEFAULT_USER)
    parser.add_argument("--remote-dir", default=DEFAULT_REMOTE_DIR)
    parser.add_argument("--pm2-name", default=DEFAULT_PM2_NAME)
    parser.add_argument("--check-only", action="store_true", help="Compare local and remote files without deploying.")
    parser.add_argument("--password", default=os.environ.get("DEPLOY_SSH_PASSWORD"))
    return parser.parse_args()


def project_root() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parent.parent


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def is_excluded(rel_parts: Iterable[str], suffix: str) -> bool:
    if set(rel_parts) & EXCLUDE_DIRS:
        return True
    return suffix in EXCLUDE_SUFFIXES


def build_local_manifest(root: pathlib.Path) -> dict[str, str]:
    manifest: dict[str, str] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if is_excluded(rel.parts, path.suffix):
            continue
        manifest[rel.as_posix()] = sha256_bytes(path.read_bytes())
    return manifest


def build_remote_manifest(client: paramiko.SSHClient, remote_dir: str) -> dict[str, str]:
    script = f"""python3 - <<'PY'
import hashlib, json, os
root={remote_dir!r}
exclude_dirs={sorted(EXCLUDE_DIRS)!r}
exclude_suffixes={sorted(EXCLUDE_SUFFIXES)!r}
out={{}}
for base, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for name in files:
        if any(name.endswith(suffix) for suffix in exclude_suffixes):
            continue
        path = os.path.join(base, name)
        rel = os.path.relpath(path, root).replace(os.sep, '/')
        with open(path, 'rb') as fh:
            out[rel] = hashlib.sha256(fh.read()).hexdigest()
print(json.dumps(out, ensure_ascii=False))
PY"""
    stdin, stdout, stderr = client.exec_command(script, timeout=180)
    raw = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if code != 0:
        raise RuntimeError(f"remote manifest failed: {err.strip()}")
    return json.loads(raw)


@dataclass
class ManifestDiff:
    missing_on_remote: list[str]
    extra_on_remote: list[str]
    different: list[str]


def diff_manifests(local: dict[str, str], remote: dict[str, str]) -> ManifestDiff:
    local_keys = set(local)
    remote_keys = set(remote)
    return ManifestDiff(
        missing_on_remote=sorted(local_keys - remote_keys),
        extra_on_remote=sorted(remote_keys - local_keys),
        different=sorted(key for key in local_keys & remote_keys if local[key] != remote[key]),
    )


def print_diff(diff: ManifestDiff) -> None:
    summary = {
        "missing_on_remote_count": len(diff.missing_on_remote),
        "extra_on_remote_count": len(diff.extra_on_remote),
        "different_count": len(diff.different),
        "missing_on_remote_sample": diff.missing_on_remote[:20],
        "extra_on_remote_sample": diff.extra_on_remote[:20],
        "different_sample": diff.different[:20],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def connect(host: str, user: str, password: str) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=user,
        password=password,
        timeout=15,
        banner_timeout=15,
        auth_timeout=15,
    )
    return client


def make_archive(root: pathlib.Path) -> pathlib.Path:
    handle = tempfile.NamedTemporaryFile(prefix="digital-commerce-practicum-", suffix=".tar.gz", delete=False)
    handle.close()
    archive = pathlib.Path(handle.name)
    with tarfile.open(archive, "w:gz") as tf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if is_excluded(rel.parts, path.suffix):
                continue
            tf.add(path, arcname=rel.as_posix())
    return archive


def upload_and_deploy(client: paramiko.SSHClient, archive: pathlib.Path, remote_dir: str, pm2_name: str) -> None:
    remote_archive = f"/tmp/{archive.name}"
    sftp = client.open_sftp()
    try:
        sftp.put(str(archive), remote_archive)
    finally:
        sftp.close()

    remote_script = f"""set -e
case {remote_dir!r} in
  /opt/*) : ;;
  *) echo "Refusing unsafe remote dir: {remote_dir}" >&2; exit 1 ;;
esac
mkdir -p {remote_dir!r}
find {remote_dir!r} -mindepth 1 -maxdepth 1 ! -name .data -exec rm -rf {{}} +
tar -xzf {remote_archive!r} -C {remote_dir!r}
cd {remote_dir!r}
test -f package.json
test -f nuxt.config.ts
test -f tsconfig.json
npm install
tar -xzf {remote_archive!r} -C {remote_dir!r} package-lock.json
npm run build
pm2 restart {pm2_name!r}
pm2 save
rm -f {remote_archive!r}
"""
    stdin, stdout, stderr = client.exec_command(remote_script, timeout=1800)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out)
    if code != 0:
        raise RuntimeError(err.strip() or f"remote deploy failed with exit code {code}")
    if err.strip():
        print(err)


def main() -> int:
    args = parse_args()
    if args.host == "112.124.63.206":
        raise SystemExit("Refusing to deploy to old ECS 112.124.63.206. Use 47.112.10.126.")

    root = project_root()
    os.chdir(root)

    if not args.password:
        args.password = getpass.getpass(f"SSH password for {args.user}@{args.host}: ")

    local_manifest = build_local_manifest(root)
    client = connect(args.host, args.user, args.password)
    try:
        remote_manifest = build_remote_manifest(client, args.remote_dir)
        diff = diff_manifests(local_manifest, remote_manifest)
        print_diff(diff)

        if args.check_only:
            return 0

        archive = make_archive(root)
        try:
            upload_and_deploy(client, archive, args.remote_dir, args.pm2_name)
        finally:
            try:
                archive.unlink()
            except OSError:
                pass

        check_script = f"cd {args.remote_dir!r} && curl -fsS http://127.0.0.1:3000/practicum >/dev/null && echo OK"
        stdin, stdout, stderr = client.exec_command(check_script, timeout=60)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        code = stdout.channel.recv_exit_status()
        if out.strip():
            print(out)
        if code != 0:
            raise RuntimeError(err.strip() or f"post-deploy check failed with exit code {code}")
        if err.strip():
            print(err)
        print(f"Deployed to http://{args.host}:3000/practicum")
    finally:
        client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
