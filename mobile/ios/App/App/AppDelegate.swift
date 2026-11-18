import UIKit
import Capacitor
import LocalAuthentication
import StoreKit
import AuthenticationServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// Bridge VC subclass so the in-app plugin below gets registered (Main.storyboard points here).
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricPlugin())
        bridge?.registerPluginInstance(RatePlugin())
        bridge?.registerPluginInstance(AutofillPlugin())
    }
}

/// "Rate concealer": the App Store app's write-review page. An https apps.apple.com link opened from the
/// web view lands in Safari, which can't hand off to the store; where the store app is missing
/// (Simulator), fall back to the system in-app rating sheet.
@objc(RatePlugin)
public class RatePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RatePlugin"
    public let jsName = "ConcealerRate"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)]
    @objc func open(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let url = URL(string: "itms-apps://apps.apple.com/app/id6816103801?action=write-review")!
            UIApplication.shared.open(url) { ok in
                if !ok, let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                    SKStoreReviewController.requestReview(in: scene)
                }
                call.resolve(["store": ok])
            }
        }
    }
}

enum AppGroup { static let id = "group.com.fxerkan.concealer" }

/// iOS side of password autofill. The fill UI itself runs in the AutoFill extension; the app only
/// mirrors its state there (`share`: the encrypted bundle + theme/bio flags, same bytes as localStorage)
/// and reports / opens the system setting.
@objc(AutofillPlugin)
public class AutofillPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AutofillPlugin"
    public let jsName = "ConcealerAutofill"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "context", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
    ]
    @objc func status(_ call: CAPPluginCall) {
        ASCredentialIdentityStore.shared.getState { st in call.resolve(["supported": true, "enabled": st.isEnabled]) }
    }
    @objc func enable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 17.0, *) { ASSettingsHelper.openCredentialProviderAppSettings { _ in } }
            else { UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!) }
            call.resolve()
        }
    }
    @objc func context(_ call: CAPPluginCall) { call.resolve(["mode": ""]) }   // the app itself is never the fill screen
    @objc func share(_ call: CAPPluginCall) {
        guard let state = call.getString("state"),
              let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: AppGroup.id)
        else { return call.reject("no app group", "failed") }
        do { try Data(state.utf8).write(to: dir.appendingPathComponent("state.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]); call.resolve() }
        catch { call.reject(error.localizedDescription, "failed") }
    }
}

/// Face ID / Touch ID unlock: the master password sits in a Keychain item that only a current
/// biometric match can read (`.biometryCurrentSet`, this device only). Enrolling a new face or
/// finger invalidates it, so the app falls back to the master password.
@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricPlugin"
    public let jsName = "ConcealerBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "store", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]
    private func base() -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.fxerkan.concealer.unlock",
         kSecAttrAccount as String: "master"]
    }

    @objc func available(_ call: CAPPluginCall) {
        let ctx = LAContext()
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        call.resolve(["available": ok, "kind": ctx.biometryType == .faceID ? "face" : "touch"])
    }

    @objc func store(_ call: CAPPluginCall) {
        guard let secret = call.getString("secret") else { return call.reject("missing secret", "failed") }
        // confirm with a biometric match first, so turning it on behaves like Android (one prompt)
        LAContext().evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                   localizedReason: call.getString("reason") ?? "Turn on biometric unlock") { ok, err in
            guard ok else { return call.reject(err?.localizedDescription ?? "failed", (err as? LAError)?.code == .userCancel ? "canceled" : "failed") }
            guard let ac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, nil)
            else { return call.reject("access control", "failed") }
            let st = self.put(secret, ac)
            st == errSecSuccess ? call.resolve() : call.reject("keychain \(st)", "failed")
        }
    }

    @objc func load(_ call: CAPPluginCall) {
        // Explicit biometric check first, then read with that same context (no second sheet). The item's
        // .biometryCurrentSet ACL enforces this on a device; the explicit check also covers the Simulator,
        // whose Keychain hands the item out without a prompt.
        let ctx = LAContext()
        ctx.localizedFallbackTitle = "Use master password"
        ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                           localizedReason: call.getString("reason") ?? "Unlock concealer") { ok, err in
            guard ok else {
                let code = (err as? LAError)?.code
                return call.reject(err?.localizedDescription ?? "failed",
                                   [.userCancel, .appCancel, .systemCancel, .userFallback].contains(code) ? "canceled" : "failed")
            }
            var q = self.base()
            q[kSecReturnData as String] = true
            q[kSecReturnAttributes as String] = true
            q[kSecMatchLimit as String] = kSecMatchLimitOne
            q[kSecUseAuthenticationContext as String] = ctx
            var out: CFTypeRef?
            let st = SecItemCopyMatching(q as CFDictionary, &out)
            if st == errSecSuccess, let a = out as? [String: Any], let d = a[kSecValueData as String] as? Data,
               let s = String(data: d, encoding: .utf8) {
                // items stored before 1.2.2 sit in the app-only group: move them so the AutoFill extension sees them
                if a[kSecAttrAccessGroup as String] as? String != AppGroup.id,
                   let ac = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, nil) {
                    _ = self.put(s, ac)
                }
                call.resolve(["secret": s])
            } else if st == errSecUserCanceled {
                call.reject("canceled", "canceled")
            } else if st == errSecItemNotFound {
                call.reject("biometrics changed", "gone")
            } else {
                call.reject("keychain \(st)", "failed")
            }
        }
    }

    private func put(_ secret: String, _ ac: SecAccessControl) -> OSStatus {
        SecItemDelete(base() as CFDictionary)
        var q = base()
        q[kSecValueData as String] = Data(secret.utf8)
        q[kSecAttrAccessControl as String] = ac
        q[kSecAttrAccessGroup as String] = AppGroup.id
        return SecItemAdd(q as CFDictionary, nil)
    }

    @objc func clear(_ call: CAPPluginCall) {
        SecItemDelete(base() as CFDictionary)
        call.resolve()
    }
}
