import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App Store default: the shell loads https://smoac.com.
 * Device testing against a local server:
 *   CAPACITOR_SERVER_URL=http://192.168.1.78:3000 npm run ios:dev
 */
const devServer = process.env.CAPACITOR_SERVER_URL?.trim();

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const devHost = devServer ? hostname(devServer) : null;

const config: CapacitorConfig = {
  appId: "com.smoac.app",
  appName: "SMOAC",
  webDir: "native/www",
  server: {
    url: devServer || "https://smoac.com",
    cleartext: Boolean(devServer?.startsWith("http://")),
    allowNavigation: [
      "smoac.com",
      "*.smoac.com",
      ...(devHost ? [devHost] : []),
    ],
    errorPath: "index.html",
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#020203",
    allowsLinkPreview: false,
  },
};

export default config;
