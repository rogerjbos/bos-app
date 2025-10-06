/**
 * Polkadot utility functions for common operations
 * 
 * This module provides helper functions for formatting, validating,
 * and manipulating Polkadot-related data.
 * 
 * @module lib/polkadot
 */

import { formatBalance as polkadotFormatBalance } from '@polkadot/util'
import { checkAddress, decodeAddress, encodeAddress } from '@polkadot/util-crypto'

/**
 * Format an address for display (truncated)
 * 
 * @param address - The full address
 * @param prefixLength - Number of characters to show at start (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Truncated address
 * 
 * @example
 * ```ts
 * formatAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 * // Returns: '5Grwva...utQY'
 * ```
 */
export function formatAddress(
  address: string | undefined,
  prefixLength = 6,
  suffixLength = 4
): string {
  if (!address) return ''
  if (address.length <= prefixLength + suffixLength) return address
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}

/**
 * Format a balance with proper decimals and symbol
 * 
 * @param balance - The balance value as string or number
 * @param decimals - Token decimals (default: 12)
 * @param symbol - Token symbol (default: 'DOT')
 * @param withSymbol - Whether to include symbol (default: true)
 * @returns Formatted balance string
 * 
 * @example
 * ```ts
 * formatTokenBalance('1000000000000', 12, 'DOT')
 * // Returns: '1.00 DOT'
 * 
 * formatTokenBalance('1000000000000', 12, 'DOT', false)
 * // Returns: '1.00'
 * ```
 */
export function formatTokenBalance(
  balance: string | number | undefined,
  decimals = 12,
  symbol = 'DOT',
  withSymbol = true
): string {
  if (!balance) return withSymbol ? `0 ${symbol}` : '0'
  
  try {
    const formatted = polkadotFormatBalance(balance.toString(), {
      decimals,
      withUnit: withSymbol ? symbol : false,
      withSi: true,
      forceUnit: symbol,
    })
    
    return formatted
  } catch (error) {
    console.error('Error formatting balance:', error)
    return withSymbol ? `${balance} ${symbol}` : balance.toString()
  }
}

/**
 * Format a large number with K, M, B suffixes
 * 
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 * 
 * @example
 * ```ts
 * formatLargeNumber(1234567)
 * // Returns: '1.23M'
 * 
 * formatLargeNumber(1234)
 * // Returns: '1.23K'
 * ```
 */
export function formatLargeNumber(num: number | string, decimals = 2): string {
  const n = typeof num === 'string' ? parseFloat(num) : num
  
  if (n < 1000) return n.toFixed(decimals)
  if (n < 1000000) return `${(n / 1000).toFixed(decimals)}K`
  if (n < 1000000000) return `${(n / 1000000).toFixed(decimals)}M`
  return `${(n / 1000000000).toFixed(decimals)}B`
}

/**
 * Validate if a string is a valid Polkadot address
 * 
 * @param address - The address to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```ts
 * isValidAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 * // Returns: true
 * 
 * isValidAddress('invalid-address')
 * // Returns: false
 * ```
 */
export function isValidAddress(address: string | undefined): boolean {
  if (!address) return false
  
  try {
    const [isValid] = checkAddress(address, 42)
    return isValid
  } catch {
    return false
  }
}

/**
 * Convert address to different SS58 format
 * 
 * @param address - The address to convert
 * @param ss58Format - Target SS58 format (0 = Polkadot, 2 = Kusama, 42 = Generic)
 * @returns Converted address or empty string on error
 * 
 * @example
 * ```ts
 * convertAddress(polkadotAddress, 2)
 * // Returns: Kusama format address
 * ```
 */
export function convertAddress(
  address: string | undefined,
  ss58Format: number
): string {
  if (!address || !isValidAddress(address)) return ''
  
  try {
    const publicKey = decodeAddress(address)
    return encodeAddress(publicKey, ss58Format)
  } catch (error) {
    console.error('Error converting address:', error)
    return ''
  }
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 * 
 * @example
 * ```ts
 * formatTimeAgo(Date.now() - 3600000)
 * // Returns: '1 hour ago'
 * ```
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Format a block time to human-readable duration
 * 
 * @param blocks - Number of blocks
 * @param blockTime - Time per block in seconds (default: 6 for Polkadot)
 * @returns Formatted duration string
 * 
 * @example
 * ```ts
 * formatBlockTime(7200)
 * // Returns: '12 hours' (7200 blocks * 6 seconds = 12 hours)
 * ```
 */
export function formatBlockTime(blocks: number, blockTime = 6): string {
  const seconds = blocks * blockTime
  
  if (seconds < 60) return `${seconds} seconds`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`
  
  return `${Math.floor(seconds / 86400)} days`
}

/**
 * Copy text to clipboard
 * 
 * @param text - Text to copy
 * @returns Promise that resolves when copy is successful
 * 
 * @example
 * ```ts
 * await copyToClipboard('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
 * ```
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    throw error
  }
}

/**
 * Validate if an identity has a positive judgement
 * 
 * @param judgements - Array of judgements from identity
 * @returns True if has positive judgement
 * 
 * @example
 * ```ts
 * hasPositiveIdentityJudgement(identity.judgements)
 * // Returns: true if identity is verified
 * ```
 */
export function hasPositiveIdentityJudgement(judgements: any[]): boolean {
  if (!Array.isArray(judgements) || judgements.length === 0) return false
  
  const positiveJudgements = ['KnownGood', 'Reasonable']
  
  return judgements.some(([_, judgement]) => {
    const judgementType = judgement.toString()
    return positiveJudgements.includes(judgementType)
  })
}

/**
 * Calculate percentage with proper rounding
 * 
 * @param value - The value
 * @param total - The total
 * @param decimals - Number of decimal places (default: 2)
 * @returns Percentage string with % symbol
 * 
 * @example
 * ```ts
 * calculatePercentage(25, 100)
 * // Returns: '25.00%'
 * ```
 */
export function calculatePercentage(
  value: number | string,
  total: number | string,
  decimals = 2
): string {
  const v = typeof value === 'string' ? parseFloat(value) : value
  const t = typeof total === 'string' ? parseFloat(total) : total
  
  if (t === 0) return '0%'
  
  const percentage = (v / t) * 100
  return `${percentage.toFixed(decimals)}%`
}

/**
 * Sleep for a specified duration (useful for delays)
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 * 
 * @example
 * ```ts
 * await sleep(1000) // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
