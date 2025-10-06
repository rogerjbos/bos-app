import { useState, useEffect } from 'react'
import { usePolkadot } from '../providers/PolkadotProvider'
import type { EventRecord } from '@polkadot/types/interfaces'

export interface ChainEvent {
  section: string
  method: string
  data: any[]
  blockNumber: number
  timestamp: number
}

/**
 * Hook to subscribe to system events
 * Useful for monitoring real-time chain activity
 * 
 * @param maxEvents - Maximum number of events to keep in memory (default: 50)
 * @returns Array of recent chain events
 * 
 * @example
 * ```tsx
 * function EventFeed() {
 *   const events = useEvents(20)
 *   
 *   return (
 *     <div>
 *       <h3>Recent Events</h3>
 *       {events.map((event, i) => (
 *         <div key={i}>
 *           {event.section}.{event.method} at block #{event.blockNumber}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useEvents(maxEvents = 50) {
  const { api, status } = usePolkadot()
  const [events, setEvents] = useState<ChainEvent[]>([])

  useEffect(() => {
    if (status !== 'connected' || !api) return

    let unsub: any
    let currentBlock = 0

    const subscribeToEvents = async () => {
      // Get current block first
      const header = await api.rpc.chain.getHeader()
      currentBlock = header.number.toNumber()

      // Subscribe to system events
      unsub = await api.query.system.events((eventRecords: EventRecord[]) => {
        const newEvents: ChainEvent[] = eventRecords.map((record) => ({
          section: record.event.section,
          method: record.event.method,
          data: record.event.data.toJSON() as any[],
          blockNumber: currentBlock,
          timestamp: Date.now(),
        }))

        setEvents((prev) => [...newEvents, ...prev].slice(0, maxEvents))
      })

      // Also subscribe to new blocks to update current block number
      await api.rpc.chain.subscribeNewHeads((header) => {
        currentBlock = header.number.toNumber()
      })
    }

    subscribeToEvents()

    return () => {
      if (unsub) unsub()
    }
  }, [api, status, maxEvents])

  return events
}
