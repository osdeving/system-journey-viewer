/**
 * Purpose: Resolve whether the app should render the desktop shell or the dedicated mobile shell route.
 */

export type AppShellMode = 'desktop' | 'mobile'

type MobileShellEnvironment = {
  innerWidth: number
  maxTouchPoints: number
  pointerCoarse: boolean
}

export const resolveRequestedAppShellMode = (pathname: string): AppShellMode =>
  pathname === '/m' || pathname.startsWith('/m/')
    ? 'mobile'
    : 'desktop'

export const shouldAutoOpenMobileShell = ({
  innerWidth,
  maxTouchPoints,
  pointerCoarse,
}: MobileShellEnvironment): boolean =>
  pointerCoarse && maxTouchPoints > 0 && innerWidth <= 960

export const buildMobileShellPath = (search = '', hash = ''): string => `/m${search}${hash}`
