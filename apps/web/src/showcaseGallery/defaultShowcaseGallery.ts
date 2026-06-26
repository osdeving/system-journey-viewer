/**
 * Purpose: Define bundled showcase scripts and exported animation samples for the gallery.
 */

import fintechFraudScript from './scripts/fintech-fraud-decisioning.sjv?raw'
import remoteCareScript from './scripts/remote-care-platform.sjv?raw'
import smartFulfillmentScript from './scripts/smart-fulfillment-network.sjv?raw'

export type DefaultShowcaseScriptItem = {
  kind: 'script'
  id: string
  workspaceId: string
  title: string
  description: string
  script: string
}

export type DefaultShowcaseAnimationItem = {
  kind: 'animation'
  id: string
  title: string
  description: string
  fileName: string
  href: string
  contentType: 'image/svg+xml'
}

export type DefaultShowcaseLibraryItem =
  | DefaultShowcaseScriptItem
  | DefaultShowcaseAnimationItem

export type DefaultShowcaseLibrarySection = {
  id: 'sample-scripts' | 'sample-animations'
  title: string
  items: DefaultShowcaseLibraryItem[]
}

export const DEFAULT_SHOWCASE_SCRIPTS: DefaultShowcaseScriptItem[] = [
  {
    kind: 'script',
    id: 'sample-script-remote-care',
    workspaceId: 'sample-remote-care-platform',
    title: 'Remote Care Platform',
    description: 'Telemedicine booking, video-room setup, and async clinical context preparation.',
    script: remoteCareScript,
  },
  {
    kind: 'script',
    id: 'sample-script-smart-fulfillment',
    workspaceId: 'sample-smart-fulfillment-network',
    title: 'Smart Fulfillment Network',
    description: 'Warehouse orchestration with parallel inventory, robot, carrier, and event flows.',
    script: smartFulfillmentScript,
  },
  {
    kind: 'script',
    id: 'sample-script-fintech-fraud',
    workspaceId: 'sample-fintech-fraud-decisioning',
    title: 'Fintech Fraud Decisioning',
    description: 'Low-latency payment risk scoring with manual-review feedback loops.',
    script: fintechFraudScript,
  },
]

export const DEFAULT_SHOWCASE_ANIMATIONS: DefaultShowcaseAnimationItem[] = [
  {
    kind: 'animation',
    id: 'sample-animation-remote-care',
    title: 'Remote Consultation Booking',
    description: 'Animated SVG export for synchronous booking plus async triage preparation.',
    fileName: 'remote-care-consultation-booking.svg',
    href: '/gallery/showcase-samples/remote-care-consultation-booking.svg',
    contentType: 'image/svg+xml',
  },
  {
    kind: 'animation',
    id: 'sample-animation-fulfillment',
    title: 'Same-day Dispatch',
    description: 'Animated SVG export showing main fulfillment flow and parallel warehouse execution.',
    fileName: 'fulfillment-same-day-dispatch.svg',
    href: '/gallery/showcase-samples/fulfillment-same-day-dispatch.svg',
    contentType: 'image/svg+xml',
  },
  {
    kind: 'animation',
    id: 'sample-animation-fintech',
    title: 'Instant Payment Risk Decision',
    description: 'Animated SVG export for fast fraud decisioning with review feedback.',
    fileName: 'fintech-risk-decision.svg',
    href: '/gallery/showcase-samples/fintech-risk-decision.svg',
    contentType: 'image/svg+xml',
  },
]

export const DEFAULT_SHOWCASE_LIBRARY_SECTIONS: DefaultShowcaseLibrarySection[] = [
  {
    id: 'sample-scripts',
    title: 'Sample SJV Scripts',
    items: DEFAULT_SHOWCASE_SCRIPTS,
  },
  {
    id: 'sample-animations',
    title: 'Sample Animated Exports',
    items: DEFAULT_SHOWCASE_ANIMATIONS,
  },
]
