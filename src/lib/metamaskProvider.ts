// Resolves the MetaMask EIP-1193 provider specifically, even when other wallet
// extensions (Phantom, Coinbase, etc.) are installed and competing for
// `window.ethereum`. Without this, a wallet like Phantom can hijack
// `window.ethereum` and intercept MetaMask connection requests, which surfaces
// as errors thrown from Phantom's `evmAsk.js` / `selectExtension`.
//
// Discovery order:
//   1. EIP-6963 announced providers (the modern, conflict-free standard)
//   2. `window.ethereum.providers[]` (legacy multi-wallet array)
//   3. `window.ethereum` itself, only if it identifies as MetaMask

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

// Collect providers announced via EIP-6963. We start listening at module load
// so announcements that fire before a connect attempt are not missed.
const announcedProviders = new Map<string, EIP6963ProviderDetail>();

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    const detail: EIP6963ProviderDetail | undefined = event?.detail;
    if (detail?.info?.uuid) {
      announcedProviders.set(detail.info.uuid, detail);
    }
  });
  // Ask any already-loaded wallets to (re)announce themselves.
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function isMetaMask(provider: any): boolean {
  // Phantom also sets `isMetaMask` in some compatibility modes, so explicitly
  // exclude wallets that flag themselves as Phantom.
  return !!provider && provider.isMetaMask === true && !provider.isPhantom;
}

/**
 * Returns the MetaMask provider, or null if MetaMask is not available.
 */
export function getMetaMaskProvider(): any | null {
  if (typeof window === "undefined") return null;

  // 1. Prefer EIP-6963 discovery — the standard way to disambiguate wallets.
  for (const { info, provider } of announcedProviders.values()) {
    if (info.rdns === "io.metamask" || isMetaMask(provider)) {
      return provider;
    }
  }

  const eth = (window as any).ethereum;
  if (!eth) return null;

  // 2. Legacy multi-wallet array injected onto window.ethereum.
  if (Array.isArray(eth.providers)) {
    const mm = eth.providers.find((p: any) => isMetaMask(p));
    if (mm) return mm;
  }

  // 3. Fall back to window.ethereum only if it is actually MetaMask.
  if (isMetaMask(eth)) return eth;

  return null;
}

/**
 * True if MetaMask is installed/available in the current page.
 */
export function isMetaMaskAvailable(): boolean {
  return getMetaMaskProvider() !== null;
}
