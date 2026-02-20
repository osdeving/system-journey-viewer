# DSL LITE Specification (JourneyScript / System Journey Viewer)

Official specification for the DSL LITE format used by the editor.

Purpose:
- define what is syntax vs convention;
- describe the real runtime semantics used by parser/converter;
- provide copy-paste examples from minimal to advanced.

Source of truth implementation:
- parser: `apps/web/src/dsl-lite/parser.ts`
- converter: `apps/web/src/dsl-lite/convert.ts`

## 1. Quick Answer: `view v_main container`

`v_main` is **not mandatory**. It is a naming convention.

This is valid:

```dsl
view batatinha container {
  container app "App"
}
```

What is fixed (keyword): `view`, `container`.  
What is free (identifier): `batatinha`.

## 2. Keywords vs Conventions

### 2.1 Keywords (syntax)

These tokens have structural meaning in DSL:

- `workspace`
- `view`
- `parent`
- `via`
- `journey`
- `color`
- `tech`
- `drilldown`
- `contains`
- `metadata`
- `ui-layout`
- `node`
- `edge`
- `at`
- `size`
- `label`
- `side`
- `font`
- `angle`

Also part of syntax:
- symbols: `{`, `}`, `->`, `:`, `"`, `,`
- view kinds: `system-context`, `container`, `component`, `hex`
- metadata edge side: `left`, `right`

### 2.2 Conventions (recommended, not required)

- View IDs like `v_main`, `v_container`, `v_component_api`.
- Node aliases prefixed by role, e.g. `api`, `worker`, `orders_db`.
- Edge labels using protocol/domain action names.

You can use any valid identifier style as long as it matches parser rules.

## 3. Identifier and Token Rules

### 3.1 Identifier format

Identifiers (view IDs, aliases, tech/protocol tokens) support:
- letters, numbers, `_`, `-`

Regex equivalent:
- `[A-Za-z0-9_-]+`

### 3.2 String format

Human names/labels are double-quoted:

```dsl
container api "Orders API"
```

### 3.3 Comments

Supported comment lines:
- `// comment`
- `# comment`

Only lines starting with these prefixes are ignored.

## 4. File Structure

A full file usually looks like:

```dsl
workspace "My Workspace" {
  view v_main container {
    ...
  }

  view v_component component parent v_main via api {
    ...
  }

  metadata ui-layout {
    view v_main {
      ...
    }
  }
}
```

## 5. Core Syntax Blocks

### 5.1 Workspace

```dsl
workspace "Name" {
  ...
}
```

### 5.2 View (modern syntax)

```dsl
view <viewId> <viewKind> {
  ...
}
```

With hierarchy declaration:

```dsl
view <viewId> <viewKind> parent <parentViewId> via <parentNodeAlias> {
  ...
}
```

### 5.3 View (legacy syntax, still accepted)

```dsl
view container {
  ...
}
```

Converter auto-generates view IDs (`v_<kind>`, `v_<kind>_2`, ...).

### 5.4 Node

```dsl
<kind> <alias> "Display Name" [tech <techId>] [drilldown <viewId>] [contains a,b,c]
```

Examples:

```dsl
container api "Orders API" tech spring-boot
container backend "Backend" tech spring-boot drilldown v_component_backend
boundary core "Core Services" contains api,worker,orders
```

### 5.5 Edge

```dsl
<fromAlias> -> <toAlias> [: <protocolId> ["Label"]]
```

Examples:

```dsl
api -> worker : kafka-event "order.created"
api -> orders : sql "insert order"
ui -> api
```

If protocol/label are omitted:
- protocol defaults to `http`
- label defaults to `request`

### 5.6 Journey

```dsl
journey "Name" [color <colorToken>] {
  <n>: <fromAlias> -> <toAlias>
}
```

Example:

```dsl
journey "Checkout Flow" color #2563eb {
  1: web -> api
  2: api -> orders
}
```

### 5.7 UI Metadata (`metadata ui-layout`)

This section stores **UI geometry only**.

```dsl
metadata ui-layout {
  view <viewId> {
    node <alias> at <x> <y> size <w> <h>
    edge <fromAlias> -> <toAlias> label <position> [side left|right] [font <size>] [angle <deg>]
  }
}
```

Examples:

```dsl
metadata ui-layout {
  view v_main {
    node api at 520 240 size 300 130
    edge web -> api label 0.34 side left font 13 angle -12
  }
}
```

## 6. Semantics (Runtime Behavior)

### 6.1 Scope

- Node aliases are scoped per view.
- Edges and journey steps must reference aliases from the same view.

### 6.2 Implicit view behavior

If declarations appear outside `view { ... }`, parser creates an implicit `v_container`.

### 6.3 Unknown values and fallback

- Unknown `view kind` -> falls back to `container`.
- Unknown node `kind` -> converter falls back to container preset.
- Unknown `tech` token -> node remains valid; tech may stay unresolved.

### 6.4 Drilldown model

Drilldown can be declared in two ways:

1. Node-level:
- `drilldown <childViewId>` inside parent node declaration.

2. Child view-level:
- `view <child> ... parent <parentViewId> via <parentAlias>`.

Converter behavior:
- maps drilldown into `node.drilldownRef`.
- if both styles exist and conflict, converter avoids overriding an already-set drilldown to another target.

### 6.5 Boundary grouping (`contains`)

When used on `boundary` node:
- converter resolves aliases to child node IDs;
- boundary `children` is populated;
- boundary bounds are recomputed to wrap children.

### 6.6 Journey step matching

Journey step `<from> -> <to>` is kept only if matching edge exists in that view.

### 6.7 Color behavior

Currently in DSL LITE:
- color token is supported on journeys (`journey ... color <token>`).
- default journey color: `#2563eb`.

Important:
- node fill color and node text color are currently edited in UI/Inspector, not in DSL LITE syntax.
- use valid CSS color values for journey color (hex recommended).

### 6.8 Metadata behavior

`metadata ui-layout` affects rendering/layout only:
- node positions and sizes;
- edge label position/side/font/angle.

It does not alter architecture semantics (nodes/edges/journeys meaning).

## 7. Import/Export/Sync in the App

### 7.1 Export full workspace

`Exportar workspace completo`:
- generates all views into one DSL file;
- includes `metadata ui-layout`.

### 7.2 Import DSL

`Importar DSL`:
- parses DSL into FULL workspace;
- applies drilldown/group boundaries;
- applies `metadata ui-layout`;
- preserves current app theme during import flow.

### 7.3 Sync mode

`Sync com editor`:
- keeps Monaco editable;
- applies valid DSL changes to view in real time while typing;
- if current text is invalid, sync shows parse error and keeps last valid canvas state.

## 8. Validation and Tolerance Rules

- Empty lines ignored.
- Lines starting with `//` or `#` ignored.
- Unknown lines ignored (not immediate fatal error).
- Unclosed journey block is implicitly closed at EOF.
- If no nodes are found in the whole file, parser throws:
  - `DSL LITE inválida: nenhum node encontrado.`

## 9. Examples

### 9.1 Minimum possible example

```dsl
workspace "Tiny" {
  view batatinha container {
    container app "App"
  }
}
```

### 9.2 Minimum useful example (edge + journey)

```dsl
workspace "Tiny Flow" {
  view v_main container {
    container app "App" tech react
    db orders "Orders DB" tech postgres
    app -> orders : sql "select order"

    journey "Smoke Test" color #0ea5e9 {
      1: app -> orders
    }
  }
}
```

### 9.3 Legacy implicit-view style

```dsl
workspace "Legacy" {
  container app "App"
  queue bus "Bus" tech kafka
  app -> bus : kafka-event "event"
}
```

This is still accepted and mapped to an implicit `v_container`.

### 9.4 Drilldown via node-level `drilldown`

```dsl
workspace "Node Drilldown" {
  view v_container container {
    container api "Orders API" tech spring-boot drilldown v_component_api
  }

  view v_component_api component {
    component use_case "CreateOrderService" tech application-service
  }
}
```

### 9.5 Drilldown via `parent ... via ...`

```dsl
workspace "Parent Via Drilldown" {
  view v_container container {
    container api "Orders API" tech spring-boot
  }

  view v_component_api component parent v_container via api {
    component use_case "CreateOrderService" tech application-service
  }
}
```

### 9.6 Metadata example (labels with side/font/angle)

```dsl
workspace "Layout Metadata" {
  view v_main container {
    container web "Web App" tech react
    container api "API" tech spring-boot
    web -> api : http "GET /status"
  }

  metadata ui-layout {
    view v_main {
      node web at 140 220 size 280 120
      node api at 560 220 size 300 130
      edge web -> api label 0.72 side right font 14 angle -18
    }
  }
}
```

### 9.7 Advanced example ("cabuloso")

```dsl
workspace "CIM + SAGA + Finish - System Journey" {
  view v_main container {
    system guardian "Guardian" tech system
    system autopilot "Autopilot" tech system
    gateway api_gateway "Xway" tech nginx
    security oam "OAM" tech oauth2

    boundary core "Core Services" contains cim,saga,finish
    container cim "CIM - Customer Interaction Management" tech spring-boot drilldown v_component_cim
    container saga "CIM-SAGA - Stateful Orchestrator" tech spring-boot drilldown v_component_saga
    container finish "MS Finish Interaction" tech spring-boot drilldown v_component_finish
    queue kafka "Kafka" tech kafka
    db orders "Orders DB" tech postgres

    guardian -> api_gateway : http "authenticate"
    api_gateway -> cim : http "start interaction"
    cim -> saga : internal-call "orchestrate"
    saga -> kafka : kafka-event "cim.protocol.created"
    finish -> orders : sql "persist result"

    journey "Create + Orchestrate + Finish" color #22c55e {
      1: guardian -> api_gateway
      2: api_gateway -> cim
      3: cim -> saga
      4: saga -> kafka
      5: finish -> orders
    }
  }

  view v_component_cim component parent v_main via cim {
    component entry "InteractionController" tech component
    component use_case "CreateInteraction" tech application-service drilldown v_hex_cim
    component repo "InteractionRepository" tech component
    entry -> use_case : internal-call "handle request"
    use_case -> repo : internal-call "save interaction"
  }

  view v_hex_cim hex parent v_component_cim via use_case {
    domain core_domain "InteractionDomain" tech domain
    port-in app_in "CreateInteractionIn" tech port-in
    port-out app_out "InteractionOut" tech port-out
    adapter-in rest_in "RestController" tech adapter-in
    adapter-out db_out "MongoAdapter" tech adapter-out
    rest_in -> app_in : internal-call "invoke"
    app_in -> core_domain : internal-call "apply rules"
    core_domain -> app_out : internal-call "emit result"
    app_out -> db_out : internal-call "persist"
  }

  view v_component_saga component parent v_main via saga {
    component orchestrator "SagaOrchestrator" tech component
  }

  view v_component_finish component parent v_main via finish {
    component finisher "FinishInteractionService" tech component
  }

  metadata ui-layout {
    view v_main {
      node guardian at 80 130 size 220 110
      node api_gateway at 360 130 size 220 110
      node cim at 660 120 size 280 120
      node saga at 980 120 size 280 120
      node finish at 1310 120 size 280 120
      node kafka at 1000 340 size 260 120
      node orders at 1310 340 size 260 120
      edge guardian -> api_gateway label 0.42 side left
      edge api_gateway -> cim label 0.4 side left font 13
      edge cim -> saga label 0.47 side left font 13 angle -8
      edge saga -> kafka label 0.58 side right
      edge finish -> orders label 0.46 side left
    }
  }
}
```

## 10. Recommended Catalog Tokens

### 10.1 Node kinds

- `system`
- `container`
- `component`
- `boundary`
- `db`
- `queue`
- `gateway`
- `security`
- `domain`
- `application-service`
- `port-in`
- `port-out`
- `adapter-in`
- `adapter-out`

### 10.2 Protocol IDs

- `http`
- `internal-call`
- `grpc`
- `kafka-event`
- `sql`
- `oauth2-token`

### 10.3 Tech IDs

- `system`
- `react`
- `spring-boot`
- `component`
- `boundary`
- `postgres`
- `kafka`
- `nginx`
- `oauth2`
- `domain`
- `application-service`
- `port-in`
- `port-out`
- `adapter-in`
- `adapter-out`
- `observability`
- `redis`
- `elasticsearch`

## 11. DSL Authoring Checklist

Before importing:
1. `workspace "..." {` exists.
2. each modern view has unique `viewId`.
3. there is at least one node in total.
4. every edge alias exists as node alias in same view.
5. journey steps map to existing edges in same view.
6. `drilldown` / `parent via` references are valid.
7. `contains` aliases exist in same view.
8. if using `metadata ui-layout`, view IDs and aliases match declared elements.
