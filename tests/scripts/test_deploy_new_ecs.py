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


if __name__ == "__main__":
    unittest.main()
