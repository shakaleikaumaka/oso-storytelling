// OSO Web3 Songbook — chain & contract configuration.
// Modular by design: add a chain entry + deployed address and the dApp follows.
// NO secrets belong in this file — addresses and public RPC endpoints only.

export const CHAINS = {
  // Local development chain (anvil)
  31337: {
    name: 'anvil (local)',
    rpc: 'http://127.0.0.1:8545',
    explorer: null,
  },
  // First testnet (per spec §3). Mainnet deployment is intentionally absent.
  11155111: {
    name: 'Sepolia',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
  },
};

// Deployed OsoSongbook registry addresses, per chain id.
// Fill in after running contracts/script/Deploy.s.sol.
export const DEPLOYMENTS = {
  31337: '', // printed by the deploy script against anvil
  11155111: '', // Sepolia — not yet deployed
};

// ENS is resolved on Ethereum mainnet (read-only) even while the app
// contract runs on a testnet (spec §3).
export const ENS_MAINNET_RPC = 'https://ethereum-rpc.publicnode.com';

// Dev override: lets a local session point at a fresh anvil deployment without
// editing this file. Set from the browser console:
//   localStorage.setItem('oso_songbook_address', '0x...')
//   localStorage.setItem('oso_songbook_chain', '31337')
export function contractAddressFor(chainId) {
  try {
    const o = localStorage.getItem('oso_songbook_address');
    if (o && /^0x[0-9a-fA-F]{40}$/.test(o)) return o;
  } catch (_) { /* storage unavailable — fall through */ }
  return DEPLOYMENTS[chainId] || '';
}

export function chainInfo(chainId) {
  return CHAINS[chainId] || null;
}

// The chain this page expects to operate on (wrong-chain guard, spec §28.20).
export function expectedChainId() {
  try {
    const o = parseInt(localStorage.getItem('oso_songbook_chain') || '', 10);
    if (CHAINS[o]) return o;
  } catch (_) { /* ignore */ }
  return 11155111; // Sepolia by default once deployed there
}
