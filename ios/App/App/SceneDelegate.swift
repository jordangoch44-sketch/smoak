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
    private var loadingObserver: NSKeyValueObservation?
    private var appliedSafeTop: CGFloat = -1
    private var appliedSafeBottom: CGFloat = -1

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        installGeolocationPermission()
        observePageLoads()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        installGeolocationPermission()
        publishSafeAreaInsets(force: true)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishSafeAreaInsets(force: false)
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishSafeAreaInsets(force: true)
    }

    private func installGeolocationPermission() {
        guard !didInstallGeolocation, let webView else { return }
        geolocationDelegate.forward = webView.uiDelegate
        webView.uiDelegate = geolocationDelegate
        didInstallGeolocation = true
    }

    /// WKWebView often reports `env(safe-area-inset-*)` as 0. Publish the
    /// view's real insets so app-only CSS can clear the clock and home indicator.
    private func observePageLoads() {
        guard let webView, loadingObserver == nil else { return }
        loadingObserver = webView.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            guard webView.isLoading == false else { return }
            DispatchQueue.main.async {
                self?.publishSafeAreaInsets(force: true)
            }
        }
    }

    private func publishSafeAreaInsets(force: Bool) {
        guard let webView else { return }
        let top = view.safeAreaInsets.top
        let bottom = view.safeAreaInsets.bottom
        if !force, top == appliedSafeTop, bottom == appliedSafeBottom { return }

        let topPx = String(format: "%.2fpx", top)
        let bottomPx = String(format: "%.2fpx", bottom)
        #if DEBUG
        let apnsEnvironment = "sandbox"
        #else
        let apnsEnvironment = "production"
        #endif
        let js = """
        document.documentElement.dataset.apnsEnvironment='\(apnsEnvironment)';
        document.documentElement.style.setProperty('--native-safe-top','\(topPx)');
        document.documentElement.style.setProperty('--native-safe-bottom','\(bottomPx)');
        """
        webView.evaluateJavaScript(js) { [weak self] _, error in
            guard error == nil else { return }
            DispatchQueue.main.async {
                guard let self else { return }
                if self.view.safeAreaInsets.top == top, self.view.safeAreaInsets.bottom == bottom {
                    self.appliedSafeTop = top
                    self.appliedSafeBottom = bottom
                }
            }
        }
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
