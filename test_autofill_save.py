#!/usr/bin/env python3
"""Self-check for af_save (extension "save this sign-in"). Run: python3 test_autofill_save.py"""
import os, importlib.util
from importlib.machinery import SourceFileLoader

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "concealer")
spec = importlib.util.spec_from_loader("concealer", SourceFileLoader("concealer", path))
cer = importlib.util.module_from_spec(spec); spec.loader.exec_module(cer)

U = "https://eu-central-1.signin.aws/platform/login?workflowStateHandle=565f0c40"

def test_flow():
    d = {"secrets": []}
    b = {"url": U, "username": "iamuser", "password": "sk-DUMMY-1", "account": "123456789012", "extra": {"Region": "eu-central-1"}}
    assert cer.af_save(d, dict(b, dry=1), dry=True)[0] == "new" and not d["secrets"], "dry must not write"
    st, e = cer.af_save(d, b)
    assert st == "new" and e["type"] == "login"
    assert e["url"] == "https://eu-central-1.signin.aws", "one-time query/path must be stripped"
    f = e["fields"]
    assert f["username"] == "iamuser" and f["password"] == "sk-DUMMY-1" and f["account_id"] == "123456789012" and f["region"] == "eu-central-1"
    assert cer.af_save(d, b, dry=True)[0] == "same", "re-submitting saved creds must not prompt"
    st, e2 = cer.af_save(d, dict(b, password="sk-DUMMY-2"))
    assert st == "update" and e2 is e and e["fields"]["password"] == "sk-DUMMY-2" and len(d["secrets"]) == 1
    # another account on the same site is a separate record, named apart
    st, e3 = cer.af_save(d, dict(b, account="999999999999"))
    assert st == "new" and len(d["secrets"]) == 2 and e3["name"] != e["name"]
    # older AWS records (amazon.com sign-in host) and the new signin.aws host match each other
    assert [x["id"] for x, _ in cer.af_candidates(d, "https://123456789012.signin.aws.amazon.com/console")][0] == e["id"]

def test_local_hosts():
    # a dev site on 127.0.0.1 / localhost is its own site (was "0.1" from the last two labels)
    assert cer.registrable_domain("127.0.0.1") == "127.0.0.1" and cer.registrable_domain("localhost") == "localhost"
    d = {"secrets": []}
    st, e = cer.af_save(d, {"url": "http://127.0.0.1:8800/login.html", "username": "u", "password": "sk-DUMMY-9", "name": "Mock sign-in"})
    assert e["url"] == "http://127.0.0.1:8800" and e["name"] == "Mock sign-in"
    assert cer.af_candidates(d, "http://127.0.0.1:8800/other")[0][0] is e

def test_page_label_fields():
    # every saved field goes back to the page by name; no special-casing of field names
    e = cer.norm({"name": "m", "type": "login", "fields": {"web_url": "http://127.0.0.1:8800", "username": "u", "password": "sk-DUMMY-5",
                                                         "account_id_12_digits_or_account_alias": "123456789012", "region": "eu-central-1"}})
    assert cer.af_extra(e) == {"username": "u", "account_id_12_digits_or_account_alias": "123456789012", "region": "eu-central-1"}, "url/password stay out"

def test_rejects():
    for b in ({"url": "file:///x", "password": "p"}, {"url": U, "password": ""}):
        try: cer.af_save({"secrets": []}, b); assert False, b
        except ValueError: pass

if __name__ == "__main__":
    test_flow(); test_local_hosts(); test_page_label_fields(); test_rejects()
    print("ok")
