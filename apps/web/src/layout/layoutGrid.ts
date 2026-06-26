/**
 * Purpose: Provide pure layout and sizing calculations for the desktop-style web shell.
 */

type LayoutGridRowsInput = {
  immersiveMode: boolean
  drawerVisible: boolean
  journeyHeight: number
  managedBottomHostVisible?: boolean
  managedBottomHostHeight?: number
  statusBarVisible?: boolean
  statusBarHeight?: number
}

export const resolveLayoutGridTemplateRows = ({
  immersiveMode,
  drawerVisible,
  journeyHeight,
  managedBottomHostVisible = false,
  managedBottomHostHeight = 0,
  statusBarVisible = false,
  statusBarHeight = 0,
}: LayoutGridRowsInput): string => {
  const statusBarRow = `${statusBarVisible ? statusBarHeight : 0}px`
  if (immersiveMode) {
    return `auto 1fr ${statusBarRow}`
  }
  return `auto 1fr ${managedBottomHostVisible ? managedBottomHostHeight : 0}px ${drawerVisible ? journeyHeight : 0}px ${statusBarRow}`
}
