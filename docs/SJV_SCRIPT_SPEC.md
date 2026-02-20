# SJV Script Specification

This document defines the **SJV Script** format used by System Journey Viewer.

SJV Script is the single text format for:
- modeling views, nodes, edges, and journeys,
- modeling drilldown hierarchy,
- optionally storing UI geometry metadata.

## 1. Design Goals

- Deterministic parsing.
- Stable edge references even when multiple edges share the same `source -> target`.
- Journey order inferred by line position, not numeric counters.
- Explicit view hierarchy (`parent ... via ...`) and node-level drilldown (`drilldown ...`).
- Notes supported as attached context nodes.

## 2. Keywords vs Conventions

## 2.1 Keywords (syntax)

Reserved tokens with structural meaning:
- `workspace`
- `view`
- `parent`
- `via`
- `tech`
- `drilldown`
- `contains`
- `journey`
- `color`
- `metadata`
- `ui-layout`
- `node`
- `edge`
- `label`
- `at`
- `size`
- `side`
- `font`
- `angle`
- `note`
- `on`

## 2.2 Conventions (recommended, not required)

- View IDs like `v_main`, `v_component_api`, `v_hex_order`.
- Node aliases in `snake_case`.
- Edge IDs prefixed by intent, for example `e_api_to_saga_create`.
- Journey IDs prefixed with `j_`.

## 3. Grammar Overview

## 3.1 Workspace

```sjv
workspace "Workspace Name" {
  ...
}
```

## 3.2 View

```sjv
view <viewId> <viewKind> {
  ...
}
```

Or with explicit parent relation:

```sjv
view <viewId> <viewKind> parent <parentViewId> via <parentNodeAlias> {
  ...
}
```

Valid view kinds:
- `system-context`
- `container`
- `component`
- `hex`

## 3.3 Nodes

Regular node:

```sjv
<kind> <alias> "Display Name" [tech <techId>] [drilldown <viewId>] [contains a,b,c]
```

Note node attached to another node:

```sjv
note <alias> on <targetAlias> "Text"
```

Examples:

```sjv
container saga "Saga Orchestrator" tech spring-boot drilldown v_component_saga
boundary core "Core Area" contains saga,db
note note_auth on saga "Requires OAuth scope: interaction:write"
```

## 3.4 Edges

```sjv
<edgeId>: <fromAlias> -> <toAlias> : <protocol> "label"
```

Protocol and label are optional:

```sjv
<edgeId>: <fromAlias> -> <toAlias>
```

Defaults when omitted:
- protocol: `http`
- label: `request`

Important:
- There is **no `edge` keyword** for runtime edges.
- Edge identity comes from `<edgeId>`.
- Multiple edges between the same two nodes are supported and unambiguous.

## 3.5 Journeys

```sjv
journey <journeyId> "Journey Name" color <colorValue> {
  <edgeId>
  <edgeId>
  <edgeId>
}
```

Rules:
- Each line is an edge reference.
- Order is inferred by line position.
- Numeric step prefixes are not used.

## 3.6 Optional UI metadata

```sjv
metadata ui-layout {
  view <viewId> {
    node <alias> at <x> <y> size <w> <h>
    edge <edgeId> label <position> [side left|right] [font <size>] [angle <degrees>]
  }
}
```

Notes:
- Metadata is UI-only and optional.
- Runtime semantics are not changed by metadata.

## 4. Minimal Example

```sjv
workspace "Minimal Demo" {
  view v_main container {
    system user "User" tech system
    container api "API" tech spring-boot

    e_user_api: user -> api : http "create interaction"

    journey j_create "Create interaction" color #2563eb {
      e_user_api
    }
  }
}
```

## 5. Parallel Edges Example (A -> B twice)

```sjv
workspace "Parallel Edge Demo" {
  view v_main container {
    container saga "Saga" tech spring-boot
    db core_db "Core DB" tech postgres

    e_create: saga -> core_db : sql "create interaction"
    e_update: saga -> core_db : http "save protocol"

    journey j_protocol "Protocol Flow" color #0ea5e9 {
      e_create
      e_update
    }
  }
}
```

`journey` resolves by `edgeId`, so there is no ambiguity.

## 6. Notes

A `note`:
- is a node attached to a target node with `note <alias> on <targetAlias> "..."`;
- renders with a dashed line to the target (no arrow);
- is not part of journey edges;
- cannot be connected with normal runtime edges.

When dragging a note onto a node in the canvas, the editor auto-attaches and auto-places it near free space around the target node.

## 7. Drilldown

Two complementary mechanisms are supported.

## 7.1 Node-level drilldown

```sjv
container api "Orders API" tech spring-boot drilldown v_component_api
```

## 7.2 View-level parent relation

```sjv
view v_component_api component parent v_container via api {
  ...
}
```

Recommended: keep both coherent.

## 8. Colors and Text Styling

Script-level color support:
- Journey color: `journey ... color <value>`.

Current editor behavior:
- Node fill color and node text color are edited in Inspector and persisted in workspace state.
- They are not first-class runtime tokens in SJV Script.

## 9. Advanced Example

```sjv
workspace "Customer Interaction Management - System Journey" {
  view v_main container {
    system guardian "Guardian" tech system
    gateway api_gateway "Axway" tech nginx
    security oam "OAM" tech oauth2
    container cim "CIM" tech spring-boot drilldown v_component_cim
    container saga "CIM Saga" tech spring-boot drilldown v_component_saga
    db core_db "Saga DB" tech postgres
    queue topic_protocol_create "cim.protocol.create" tech kafka
    queue topic_protocol_created "cim.protocol.created" tech kafka

    note note_oauth on cim "Client credentials flow required"

    e_guardian_gateway: guardian -> api_gateway : http "start interaction"
    e_gateway_cim: api_gateway -> cim : http "forward interaction"
    e_cim_oam: cim -> oam : oauth2-token "validate token"
    e_cim_saga: cim -> saga : http "start orchestration"
    e_saga_db_create: saga -> core_db : sql "persist CHAMADA_INICIADA"
    e_saga_topic_create: saga -> topic_protocol_create : kafka-event "request protocol"
    e_protocol_consume: topic_protocol_create -> saga : kafka-event "protocol requested"
    e_protocol_publish: saga -> topic_protocol_created : kafka-event "protocol created"
    e_saga_db_update: saga -> core_db : http "persist protocol"

    journey j_start_call "Call Start + Protocol" color #2563eb {
      e_guardian_gateway
      e_gateway_cim
      e_cim_oam
      e_cim_saga
      e_saga_db_create
      e_saga_topic_create
      e_protocol_consume
      e_protocol_publish
      e_saga_db_update
    }
  }

  view v_component_cim component parent v_main via cim {
    component cim_app "InteractionService" tech application-service
    component cim_repo "InteractionRepository" tech component

    e_cim_component_repo: cim_app -> cim_repo : internal-call "save aggregate"

    journey j_cim_component "CIM Component Flow" color #16a34a {
      e_cim_component_repo
    }
  }

  metadata ui-layout {
    view v_main {
      node guardian at 120 120 size 220 120
      node api_gateway at 420 120 size 220 120
      node cim at 720 120 size 220 120
      node saga at 1020 120 size 220 120
      node core_db at 1020 340 size 220 120
      node note_oauth at 760 20 size 240 100
      edge e_guardian_gateway label 0.5 side left
      edge e_gateway_cim label 0.5 side left
      edge e_cim_oam label 0.46 side right
      edge e_cim_saga label 0.56 side left
      edge e_saga_db_create label 0.42 side left
    }
  }
}
```

## 10. Validation Rules

Parser-level hard errors:
- no `view` block found,
- no node declarations in workspace.

Recommended authoring checks:
- every journey step references an edge ID defined in the same view;
- `drilldown` and `parent ... via ...` references point to valid targets;
- `contains` aliases in boundaries exist in the same view.

## 11. Export / Import Behavior

- Export full workspace: writes all views plus optional `metadata ui-layout`.
- Import script: rebuilds full workspace model, preserving current app theme.
- Sync with editor: keeps editor writable and applies valid script changes live to the current view state.

