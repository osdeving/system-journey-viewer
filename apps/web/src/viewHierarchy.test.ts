/**
 * Purpose: Verify view Hierarchy behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from './model/defaultWorkspace'
import {
  buildViewHierarchyOptions,
  resolvePreferredEntryViewId,
  resolveViewHistoryForView,
  resolveViewLineage,
} from './viewHierarchy'

describe('viewHierarchy', () => {
  it('resolves lineage and history for nested drilldown views', () => {
    const workspace = createDefaultWorkspace()

    expect(resolveViewLineage(workspace, 'v_hex_api')).toEqual([
      'v_container',
      'v_components_api',
      'v_hex_api',
    ])
    expect(resolveViewHistoryForView(workspace, 'v_hex_api')).toEqual([
      'v_container',
      'v_components_api',
    ])
    expect(resolveViewHistoryForView(workspace, 'v_container')).toEqual([])
  })

  it('builds hierarchical options with depth order', () => {
    const workspace = createDefaultWorkspace()
    const options = buildViewHierarchyOptions(workspace)

    expect(options.map((option) => option.viewId)).toEqual([
      'v_container',
      'v_components_worker',
      'v_hex_worker',
      'v_components_api',
      'v_hex_api',
    ])
    expect(options.map((option) => option.depth)).toEqual([0, 1, 2, 1, 2])
  })

  it('prefers a container or system-context root as entry view', () => {
    const workspace = createDefaultWorkspace()
    expect(resolvePreferredEntryViewId(workspace)).toBe('v_container')
  })
})
