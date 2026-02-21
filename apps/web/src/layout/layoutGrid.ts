type LayoutGridRowsInput = {
  immersiveMode: boolean
  drawerVisible: boolean
  journeyHeight: number
}

export const resolveLayoutGridTemplateRows = ({
  immersiveMode,
  drawerVisible,
  journeyHeight,
}: LayoutGridRowsInput): string => {
  if (immersiveMode) {
    return 'auto 1fr'
  }
  return `auto 1fr ${drawerVisible ? journeyHeight : 0}px`
}
