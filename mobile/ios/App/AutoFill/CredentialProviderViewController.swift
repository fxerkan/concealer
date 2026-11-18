import AuthenticationServices
import LocalAuthentication
import WebKit

/// "concealer" under Passwords in Safari / other apps' sign-in fields. Runs the app's own web UI
/// (bundled here as `public/`) in a plain WKWebView: Capacitor isn't extension-safe, so a small JS shim
/// stands in for the two plugins the fill screen uses (ConcealerAutofill, ConcealerBiometric). The vault
/// is the encrypted bundle the app mirrors into the App Group; it is only decrypted inside the web view,
/// with the master password or the one Face ID / Touch ID releases, exactly like in the app.
class CredentialProviderViewController: ASCredentialProviderViewController, WKScriptMessageHandlerWithReply, WKURLSchemeHandler {
    private static let group = "group.com.fxerkan.concealer"
    private var web: WKWebView?
    private var domain = ""

    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        domain = serviceIdentifiers.first.map { $0.type == .URL ? (URL(string: $0.identifier)?.host ?? $0.identifier) : $0.identifier } ?? ""
        load()
    }

    private func load() {
        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(self, forURLScheme: "concealer")
        cfg.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "cer")
        cfg.userContentController.addUserScript(WKUserScript(source: shim(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let w = WKWebView(frame: view.bounds, configuration: cfg)
        w.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        w.scrollView.isScrollEnabled = false
        w.isOpaque = false
        w.backgroundColor = UIColor(red: 10/255, green: 11/255, blue: 13/255, alpha: 1)
        view.backgroundColor = w.backgroundColor
        view.addSubview(w)
        w.load(URLRequest(url: URL(string: "concealer://localhost/index.html")!))
        web = w
    }

    // localStorage is seeded from the app's mirrored state on every open (null = remove, so turning
    // Face ID off in the app also turns it off here); method calls go through the reply handler.
    private func shim() -> String {
        let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.group)
        let state = dir.flatMap { try? String(contentsOf: $0.appendingPathComponent("state.json"), encoding: .utf8) } ?? "{}"
        return """
        (() => {
          const st = \(state);
          for (const k of ["bundle","rev","theme","bio","idle"]) st[k] == null ? localStorage.removeItem("cer."+k) : localStorage.setItem("cer."+k, st[k]);
          const call = (m, a) => window.webkit.messageHandlers.cer.postMessage({m, a: a || {}})
            .then(r => r && r.__err ? Promise.reject({code: r.__err, message: r.__err}) : r);
          window.Capacitor = { getPlatform: () => "ios", Plugins: {
            ConcealerAutofill: { context: () => call("context"), fill: a => call("fill", a), done: () => call("done"),
                                 status: () => Promise.resolve({supported: false}) },
            ConcealerBiometric: { available: () => call("bioAvailable"), load: a => call("bioLoad", a),
                                  store: () => Promise.reject({code: "failed", message: "Turn it on in the concealer app."}),
                                  clear: () => Promise.resolve() } } };
        })();
        """
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:], a = body["a"] as? [String: Any] ?? [:]
        switch body["m"] as? String {
        case "context":
            replyHandler(["mode": "fill", "domain": domain], nil)
        case "fill":
            replyHandler(true, nil)
            extensionContext.completeRequest(withSelectedCredential:
                ASPasswordCredential(user: a["username"] as? String ?? "", password: a["password"] as? String ?? ""))
        case "done":
            replyHandler(true, nil)
            extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
        case "bioAvailable":
            let ctx = LAContext()
            let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
            replyHandler(["available": ok, "kind": ctx.biometryType == .faceID ? "face" : "touch"], nil)
        case "bioLoad":
            bioLoad(a["reason"] as? String ?? "Unlock concealer") { r in DispatchQueue.main.async { replyHandler(r, nil) } }
        default:
            replyHandler(nil, "unknown method")
        }
    }

    // Same flow as the app's BiometricPlugin.load: explicit biometric check, then read the shared item.
    private func bioLoad(_ reason: String, _ done: @escaping ([String: Any]) -> Void) {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = "Use master password"
        ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { ok, err in
            guard ok else {
                let code = (err as? LAError)?.code
                return done(["__err": [.userCancel, .appCancel, .systemCancel, .userFallback].contains(code) ? "canceled" : "failed"])
            }
            let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: "com.fxerkan.concealer.unlock",
                                    kSecAttrAccount as String: "master",
                                    kSecAttrAccessGroup as String: Self.group,
                                    kSecReturnData as String: true,
                                    kSecMatchLimit as String: kSecMatchLimitOne,
                                    kSecUseAuthenticationContext as String: ctx]
            var out: CFTypeRef?
            let st = SecItemCopyMatching(q as CFDictionary, &out)
            if st == errSecSuccess, let d = out as? Data, let s = String(data: d, encoding: .utf8) { done(["secret": s]) }
            else { done(["__err": st == errSecUserCanceled ? "canceled" : st == errSecItemNotFound ? "gone" : "failed"]) }
        }
    }

    // concealer://localhost/<path> → bundled public/<path>. A real origin (not file://) so localStorage
    // and the ES module script behave as in the app.
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let root = Bundle.main.resourceURL?.appendingPathComponent("public") else { return }
        let file = root.appendingPathComponent(url.path == "/" ? "index.html" : url.path).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {
            return task.didFailWithError(URLError(.fileDoesNotExist))
        }
        let types = ["html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css",
                     "json": "application/json", "svg": "image/svg+xml", "png": "image/png"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil,
                                        headerFields: ["Content-Type": types[file.pathExtension] ?? "application/octet-stream"])!)
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
