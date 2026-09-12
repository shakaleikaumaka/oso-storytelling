// OSO Web3 Songbook — wallet connection (window.ethereum / EIP-1193).
// The wallet is required ONLY for editing/governance actions; public browsing
// never touches this module's connect path (spec §2).

import { BrowserProvider } from './vendor/ethers-6.15.0.min.js';
import { chainInfo, expectedChainId } from './config.js';

const state = {
  provider: null, // ethers BrowserProvider
  address: null,
  chainId: null,
  listeners: new Set(),
};

export function hasWallet() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export function walletState() {
  return { address: state.address, chainId: state.chainId };
}

export function onWalletChange(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

function notify() {
  for (const fn of state.listeners) {
    try { fn(walletState()); } catch (e) { console.error('[oso-web3] listener error', e); }
  }
}

/// Connect the wallet (prompts the user). Returns { address, chainId }.
export async function connectWallet() {
  if (!hasWallet()) throw new Error('No Ethereum wallet found — install MetaMask or a compatible wallet.');
  state.provider = new BrowserProvider(window.ethereum, 'any');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  state.address = accounts && accounts.length ? accounts[0] : null;
  state.chainId = Number((await state.provider.getNetwork()).chainId);

  // react to account / chain switches
  window.ethereum.on?.('accountsChanged', (accs) => {
    state.address = accs && accs.length ? accs[0] : null;
    notify();
  });
  window.ethereum.on?.('chainChanged', (hexId) => {
    state.chainId = parseInt(hexId, 16);
    // ethers providers cache the network — rebuild on chain switch
    state.provider = new BrowserProvider(window.ethereum, 'any');
    notify();
  });

  notify();
  return walletState();
}

export function browserProvider() {
  if (!state.provider) throw new Error('Wallet not connected');
  return state.provider;
}

export async function getSigner() {
  return browserProvider().getSigner();
}

/// Wrong-chain guard (spec §28.20): true if the wallet sits on the expected
/// chain; otherwise offers a switch and returns false so callers abort writes.
export async function ensureExpectedChain() {
  const want = expectedChainId();
  if (state.chainId === want) return true;
  const info = chainInfo(want);
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + want.toString(16) }],
    });
    return true; // chainChanged listener updates state
  } catch (err) {
    // 4902: chain unknown to the wallet — try adding it (local anvil case)
    if (err && err.code === 4902 && info) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x' + want.toString(16),
            chainName: info.name,
            rpcUrls: [info.rpc],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          }],
        });
        return true;
      } catch (e2) {
        console.warn('[oso-web3] user declined adding chain', e2);
      }
    }
    return false;
  }
}
