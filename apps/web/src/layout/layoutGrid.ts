/**
 * Purpose: Provide pure layout and sizing calculations for the desktop-style web shell.
 */

type LayoutGridRowsInput = {
  immersiveMode: boolean
  drawerVisible: boolean
  journeyHeight: number
  managedBottomHostVisible?: boolean
  managedBottomHostHeight?: number
}

export const resolveLayoutGridTemplateRows = ({
  immersiveMode,
  drawerVisible,
  journeyHeight,
  managedBottomHostVisible = false,
  managedBottomHostHeight = 0,
}: LayoutGridRowsInput): string => {
  if (immersiveMode) {
    return 'auto 1fr'
  }
  return `auto 1fr ${managedBottomHostVisible ? managedBottomHostHeight : 0}px ${drawerVisible ? journeyHeight : 0}px`
}
