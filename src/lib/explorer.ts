/**
 * Block Explorer Utilities
 *
 * Provides utilities for generating block explorer links
 * for different networks and resource types.
 */

import { CHAINS } from "@/config/chains";

export type ExplorerType = "account" | "block" | "extrinsic" | "event";

/**
 * Get the block explorer base URL for a given network
 */
export function getExplorerBaseUrl(chainName: string): string {
  const chain = Object.values(CHAINS).find((c) => c.name === chainName);
  return chain?.explorerUrl || "https://polkadot.subscan.io";
}

/**
 * Generate a block explorer URL for a specific resource
 *
 * @example
 * ```ts
 * // Account link
 * const url = getExplorerLink('Polkadot', 'account', '1234...')
 *
 * // Extrinsic link
 * const url = getExplorerLink('Kusama', 'extrinsic', '0x1234...')
 *
 * // Block link
 * const url = getExplorerLink('Westend', 'block', '12345')
 * ```
 */
export function getExplorerLink(
  chainName: string,
  type: ExplorerType,
  value: string
): string {
  const baseUrl = getExplorerBaseUrl(chainName);

  switch (type) {
    case "account":
      return `${baseUrl}/account/${value}`;
    case "block":
      return `${baseUrl}/block/${value}`;
    case "extrinsic":
      return `${baseUrl}/extrinsic/${value}`;
    case "event":
      return `${baseUrl}/event/${value}`;
    default:
      return baseUrl;
  }
}

/**
 * Get explorer name from URL
 */
export function getExplorerName(explorerUrl: string): string {
  if (explorerUrl.includes("subscan")) return "Subscan";
  if (explorerUrl.includes("polkascan")) return "Polkascan";
  if (explorerUrl.includes("polkaholic")) return "Polkaholic";
  return "Block Explorer";
}

/**
 * Check if a value is a valid block hash (0x prefix + 64 hex chars)
 */
export function isBlockHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Check if a value is a valid extrinsic hash
 */
export function isExtrinsicHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Check if a value is a block number
 */
export function isBlockNumber(value: string | number): boolean {
  return /^\d+$/.test(value.toString());
}

/**
 * Open explorer link in new tab
 */
export function openExplorerLink(
  chainName: string,
  type: ExplorerType,
  value: string
): void {
  const url = getExplorerLink(chainName, type, value);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Get all available explorers for a chain
 */
export function getChainExplorers(chainName: string): Array<{
  name: string;
  url: string;
}> {
  const chain = Object.values(CHAINS).find((c) => c.name === chainName);

  if (!chain) return [];

  // Primary explorer
  const explorers = [
    {
      name: getExplorerName(chain.explorerUrl),
      url: chain.explorerUrl,
    },
  ];

  // Add alternative explorers based on chain
  if (chainName === "Polkadot") {
    explorers.push(
      {
        name: "Polkascan",
        url: "https://polkadot.polkascan.io",
      },
      {
        name: "Polkaholic",
        url: "https://polkadot.polkaholic.io",
      }
    );
  } else if (chainName === "Kusama") {
    explorers.push(
      {
        name: "Polkascan",
        url: "https://kusama.polkascan.io",
      },
      {
        name: "Polkaholic",
        url: "https://kusama.polkaholic.io",
      }
    );
  }

  return explorers;
}

/**
 * Format explorer link with shortened text
 */
export function formatExplorerLink(
  chainName: string,
  type: ExplorerType,
  value: string,
  shorten: boolean = true
): {
  url: string;
  text: string;
} {
  const url = getExplorerLink(chainName, type, value);

  let text = value;
  if (shorten) {
    if (type === "account") {
      text = `${value.slice(0, 6)}...${value.slice(-4)}`;
    } else if (type === "extrinsic" || type === "block") {
      text = `${value.slice(0, 8)}...${value.slice(-6)}`;
    }
  }

  return { url, text };
}

export default {
  getExplorerBaseUrl,
  getExplorerLink,
  getExplorerName,
  isBlockHash,
  isExtrinsicHash,
  isBlockNumber,
  openExplorerLink,
  getChainExplorers,
  formatExplorerLink,
};
