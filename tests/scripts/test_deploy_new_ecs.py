from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEPLOY_SCRIPT = PROJECT_ROOT / "scripts" / "deploy-new-ecs.py"
POWERSHELL_SCRIPT = PROJECT_ROOT / "scripts" / "deploy-new-ecs.ps1"


def load_deploy_module():
    spec = importlib.util.spec_from_file_location("deploy_new_ecs", DEPLOY_SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class DeployNewEcsTests(unittest.TestCase):
    def test_deployment_archives_exclude_persistent_data(self):
        deploy = load_deploy_module()

        self.assertTrue(deploy.is_excluded((".data", "auth-users.json"), ".json"))
        self.assertIn('--exclude="./.data"', POWERSHELL_SCRIPT.read_text(encoding="utf-8"))

    def test_wait_for_remote_health_retries_until_the_app_is_ready(self):
        deploy = load_deploy_module()

        class Channel:
            def __init__(self, code):
                self.code = code

            def recv_exit_status(self):
                return self.code

        class Stream:
            def __init__(self, code, content=b""):
                self.channel = Channel(code)
                self.content = content

            def read(self):
                return self.content

        class Client:
            def __init__(self):
                self.calls = 0

            def exec_command(self, script, timeout):
                self.calls += 1
                code = 0 if self.calls == 2 else 7
                return None, Stream(code, b"OK" if code == 0 else b""), Stream(code, b"not ready" if code else b"")

        client = Client()
        self.assertTrue(deploy.wait_for_remote_health(client, "/opt/digital-commerce-practicum", attempts=2, interval_seconds=0, sleep=lambda _: None))
        self.assertEqual(client.calls, 2)


if __name__ == "__main__":
    unittest.main()
