# App Store — App Review Information

## Sign-In Information
Leave **"Sign-in required" UNCHECKED**. Concealer has no user accounts and no
username/password login — access is a *master password* that unlocks a local,
end-to-end-encrypted vault, plus a connection to a small self-hosted "concealer host"
the user runs on their own network. All of this is explained in Notes below.

## Contact Information
Erkan · Çiftçi · +90 530 264 8400 · concealer@fxerkan.com

## Notes (paste into the Notes field, ≤4000 chars)

Concealer is a local-only, self-hosted secret manager. It has NO user accounts and NO
company servers — nothing is ever sent to us or any third party. The app is a client for
a small "concealer host" the user runs on their own computer on the same local network.

On first launch the app connects to that host over the LAN and unlocks an
end-to-end-encrypted vault with a master password. The vault is then stored encrypted on
the device and can be reopened offline with the same master password. There is no
username; the only credentials are a host address + a master password.

HOW TO TEST THE APP
Because the app talks to a host on the user's own network, we have stood up a demo host
you can reach during review (it holds only dummy secrets and a throwaway password):

• Host address:  <DEMO_HOST_URL>          (e.g. https://concealer-demo.<tunnel>.dev)
• Master password:  <DEMO_MASTER_PASSWORD>

Steps:
1. Launch the app — you'll see the setup screen.
2. In "Host address (manual)" enter the demo host address above.
3. Enter the master password above.
4. Tap Connect. The encrypted vault is imported and unlocked.
5. You can now: browse secrets; tap one to view it (values are masked with a reveal/copy
   control); add, edit and delete secrets; switch theme; and watch the auto-lock timer.
6. Close and reopen the app — it now shows the offline Unlock screen (master password
   only), demonstrating that the vault works without any network once imported.

The "Servers on your network" list auto-discovers hosts via Bonjour on the LAN; the
manual field is used here because the demo host is remote. Every secret value is
end-to-end encrypted with the master password and never transmitted or stored in
plaintext. A short demonstration video is also attached.

Thank you! Questions: concealer@fxerkan.com

---

### ⚠️ Before you submit — you must replace two placeholders
`<DEMO_HOST_URL>` and `<DEMO_MASTER_PASSWORD>` need real values Apple can reach. Do this
with a **throwaway demo vault**, never your real one:

1. Make an isolated demo vault and start its LAN host:
   `CONCEALER_HOME=/tmp/demovault sh -c 'printf "demo1234\ndemo1234\n" | concealer init'`
   then add a couple of dummy secrets and run `CONCEALER_HOME=/tmp/demovault concealer lan 8788`.
2. Expose it to the internet **for the review only** with a tunnel, e.g.
   `cloudflared tunnel --url http://localhost:8788`  (or ngrok) → gives an https URL.
3. Put that URL in `<DEMO_HOST_URL>` and `demo1234` in `<DEMO_MASTER_PASSWORD>`.
4. Optionally attach a 30–60s screen recording of the flow above (Attachment field).
5. Keep the tunnel + host running until the review completes, then shut it down.

Alternative if you prefer not to expose a host: attach the demonstration video and note
in the text that the host is LAN-only; this is riskier (reviewers may ask for a live
test), so the demo-host route above is recommended.
