import UIKit
import WebKit
import Capacitor

/// The website asks for GPS through the page. Capacitor does not answer that
/// request, so iOS drops it and the ME circle never appears. This passes the
/// question on to the system location prompt.
final class SmoacGeolocationUIDelegate: NSObject, WKUIDelegate {
    weak var forward: (any WKUIDelegate)?

    func webView(
        _ webView: WKWebView,
        requestGeolocationPermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.prompt)
    }

    override func responds(to aSelector: Selector!) -> Bool {
        if super.responds(to: aSelector) { return true }
        return forward?.responds(to: aSelector) ?? false
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        forward
    }
}

final class SmoacBridgeViewController: CAPBridgeViewController {
    private let geolocationDelegate = SmoacGeolocationUIDelegate()
    private var didInstallGeolocation = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        installGeolocationPermission()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        installGeolocationPermission()
    }

    private func installGeolocationPermission() {
        guard !didInstallGeolocation, let webView else { return }
        geolocationDelegate.forward = webView.uiDelegate
        webView.uiDelegate = geolocationDelegate
        didInstallGeolocation = true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SmoacBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
