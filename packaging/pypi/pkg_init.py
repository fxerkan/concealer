"""concealer — local-only secret manager (SOPS + age).

This file is force-included into the wheel as `concealer/__init__.py` so the
flat repo script `concealer` can ship as the package module `concealer.__main__`
with `webui.html` alongside it. See pyproject.toml [tool.hatch.build] and
docs/WINDOWS.md. The repo itself stays a flat single-file script.
"""
