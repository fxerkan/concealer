#!/usr/bin/env python3
"""Self-check for `concealer agent install` config writers. Run: python3 test_agent_install.py"""
import os, json, tempfile, importlib.util
from importlib.machinery import SourceFileLoader

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "concealer")
spec = importlib.util.spec_from_loader("concealer", SourceFileLoader("concealer", path))
cer = importlib.util.module_from_spec(spec); spec.loader.exec_module(cer)

def test_json_merge():
    d = tempfile.mkdtemp(); p = os.path.join(d, "mcp.json")
    json.dump({"mcpServers": {"other": {"command": "x"}}, "keep": 1}, open(p, "w"))  # pre-existing config
    cer._install_mcp_json(p, "mcpServers", "TESTTOK")
    got = json.load(open(p))
    assert got["keep"] == 1, "must preserve unrelated keys"
    assert got["mcpServers"]["other"]["command"] == "x", "must preserve other servers"
    c = got["mcpServers"]["concealer"]
    assert c["env"]["CONCEALER_TOKEN"] == "TESTTOK", "token must be injected"
    assert "mcp" in c["args"], "must invoke the mcp subcommand"

def test_toml_dedup():
    d = tempfile.mkdtemp(); p = os.path.join(d, "config.toml")
    first = cer._install_mcp_toml(p, "TOK1")
    assert "[mcp_servers.concealer]" in open(p).read()
    second = cer._install_mcp_toml(p, "TOK2")            # second call must NOT duplicate the block
    assert open(p).read().count("[mcp_servers.concealer]") == 1, "must not duplicate on re-run"
    assert "already present" in second

def test_detect_shape():
    for a in cer._agent_defs():
        assert callable(a["detect"]) and callable(a["install"]) and a["id"] and a["name"]

if __name__ == "__main__":
    test_json_merge(); test_toml_dedup(); test_detect_shape()
    print("ok")
