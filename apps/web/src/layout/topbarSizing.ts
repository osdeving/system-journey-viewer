/**
 * Purpose: Provide pure layout and sizing calculations for the desktop-style web shell.
 */

type TopbarHeightInput = {
  minHeight: number
  renderedHeight: number
  scrollHeight: number
}

const toSafeCeil = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.ceil(value))
}

export const resolveTopbarHeight = ({
  minHeight,
  renderedHeight,
  scrollHeight,
}: TopbarHeightInput): number =>
  Math.max(toSafeCeil(minHeight), toSafeCeil(renderedHeight), toSafeCeil(scrollHeight))
