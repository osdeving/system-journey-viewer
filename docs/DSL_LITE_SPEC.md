# DSL LITE Specification (System Journey Viewer)

Official specification for the DSL LITE format used by the editor.

Purpose:
- provide a clear contract for humans and AI tools to generate valid DSL;
- document real semantics for hierarchy, drill-down, and boundary grouping.

Status:
- source of truth implementation: `apps/web/src/dsl-lite/parser.ts` and `apps/web/src/dsl-lite/convert.ts`;
- this document reflects current runtime behavior.

## 1. Overview (Human-Readable)

DSL LITE supports a **single file with multiple views**.

Each view can declare:
- nodes
- edges
- journeys
- parent/via hierarchy

Workspace can also declare:
- optional `metadata ui-layout` (UI-only node positions and edge label positions).

Nodes can declare:
- `drilldown <viewId>`
- `contains a,b,c` (group boundary)

Short example:

```dsl
workspace "Orders" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "orders-api" tech spring-boot drilldown v_component_api
    container worker "fulfillment-worker" tech spring-boot
    db orders "orders-db" tech postgres
  }

  view v_component_api component parent v_container via api {
    component app "CreateOrderService" tech application-service
  }
}
```

## 2. EBNF

```ebnf
dsl              = ws, workspaceDecl, ws ;

workspaceDecl    = "workspace", ws1, string, ws, "{", ws, { workspaceStatement, ws }, "}" ;

viewDecl         = modernViewDecl | legacyViewDecl ;
modernViewDecl   = "view", ws1, viewId, ws1, viewKind,
                   [ ws1, "parent", ws1, viewId, ws1, "via", ws1, alias ],
                   ws, "{", ws, { statement, ws }, "}" ;
legacyViewDecl   = "view", ws1, viewKind, ws, "{", ws, { statement, ws }, "}" ;

workspaceStatement = viewDecl | metadataDecl ;
statement        = nodeDecl | edgeDecl | journeyDecl ;

metadataDecl     = "metadata", ws1, "ui-layout", ws, "{", ws, { metadataViewDecl, ws }, "}" ;
metadataViewDecl = "view", ws1, viewId, ws, "{", ws, { metadataNodeDecl | metadataEdgeDecl, ws }, "}" ;
metadataNodeDecl = "node", ws1, alias, ws1, "at", ws1, number, ws1, number,
                   ws1, "size", ws1, number, ws1, number ;
metadataEdgeDecl = "edge", ws1, alias, ws, "->", ws, alias, ws1, "label", ws1, number ;

nodeDecl         = kind, ws1, alias, ws1, string,
                   [ ws1, "tech", ws1, techId ],
                   [ ws1, "drilldown", ws1, viewId ],
                   [ ws1, "contains", ws1, aliasList ] ;

aliasList        = alias, { ws?, ",", ws?, alias } ;

edgeDecl         = alias, ws, "->", ws, alias,
                   [ ws, ":", ws, protocolId, [ ws1, string ] ] ;

journeyDecl      = "journey", ws1, string, [ ws1, "color", ws1, colorToken ],
                   ws, "{", ws, { journeyStep, ws }, "}" ;

journeyStep      = integer, ws, ":", ws, alias, ws, "->", ws, alias ;

viewKind         = "system-context" | "container" | "component" | "hex" ;
viewId           = id ;
kind             = id ;
techId           = id ;
protocolId       = id ;
alias            = id ;
colorToken       = idOrHash ;

id               = ( letter | digit | "_" | "-" ), { letter | digit | "_" | "-" } ;
idOrHash         = ( letter | digit | "_" | "-" | "#" ),
                   { letter | digit | "_" | "-" | "#" } ;
integer          = digit, { digit } ;
number           = [ "-" ], digit, { digit }, [ ".", digit, { digit } ] ;

string           = "\"", { stringChar }, "\"" ;
stringChar       = ? any char except " ? ;

ws               = { " " | "\t" | "\r" | "\n" } ;
ws1              = ( " " | "\t" ), { " " | "\t" } ;
ws?              = { " " | "\t" } ;
```

## 3. Semantic Rules

### 3.1 Workspace and views
- `workspace "..." { ... }` defines workspace name.
- multiple views are allowed in a single file.
- recommended modern format:
  - `view <viewId> <viewKind> { ... }`
- legacy format is still accepted:
  - `view <viewKind> { ... }`
  - parser auto-generates view id (`v_<kind>`).

### 3.2 View scope
- node aliases are local to each view.
- edges and journey steps must reference aliases from the same view.
- edges with unknown aliases are discarded during conversion.

### 3.3 Nodes
- format:
  - `<kind> <alias> "Name" [tech <techId>] [drilldown <viewId>] [contains a,b,c]`
- unknown `kind`: falls back to `container` preset.
- unknown `techId`: parser keeps node valid; tech may remain unresolved.

### 3.4 Drill-down and hierarchy
- parent/child links can be declared in two ways:
  1. node-level: `drilldown <childViewId>`
  2. child view-level: `parent <parentViewId> via <parentAlias>`
- full-model conversion behavior:
  - UI uses `node.drilldownRef` for double-click navigation;
  - `parent/via` also sets `drilldownRef` in the parent node.
- in case of conflict, converter avoids overwriting a pre-existing `drilldownRef` targeting another view.

### 3.5 Group boundary (`contains`)
- use on `boundary` nodes:
  - `boundary core "Core Services" contains api,worker,orders`
- import effect:
  - `boundary.children` is populated from listed aliases;
  - boundary bounds are recalculated to wrap children with padding.
- UI effect:
  - boundary renders as a grouped container around its children.

### 3.6 Edges
- format:
  - `<fromAlias> -> <toAlias> [: <protocolId> ["Label"]]`
- defaults:
  - protocol = `http`
  - label = `request`

### 3.7 Journeys
- format:
  - `journey "Name" [color <token>] { ... }`
  - step: `<n>: <fromAlias> -> <toAlias>`
- default color: `#2563eb`
- a step is kept only when matching edge (`fromAlias -> toAlias`) exists in the same view.

### 3.8 Minimum validation
- if total node count is zero:
  - error: `Invalid DSL LITE: no nodes found.`

### 3.9 UI layout metadata
- optional block:
  - `metadata ui-layout { ... }`
- purpose:
  - preserve UI geometry without changing architecture semantics.
- supported entries per view:
  - `node <alias> at <x> <y> size <w> <h>`
  - `edge <fromAlias> -> <toAlias> label <position>`
- conversion behavior:
  - import applies node bounds and edge label positions after structural conversion;
  - export includes this metadata block by default for all emitted views.

## 4. Import/Export in the Editor

- `Export full workspace`:
  - generates one DSL file containing all views;
  - includes `parent ... via ...` when drill-down relation exists.
- `Import DSL`:
  - reconstructs FULL workspace with multi-view hierarchy;
  - applies drill-down and grouped boundaries.
- synchronization remains manual:
  - editing text does not update canvas until `Import DSL` is executed.

## 5. Parser Tolerance Rules

- empty lines are ignored.
- lines starting with `//` or `#` are ignored.
- unknown lines are ignored (not an error by themselves).
- unclosed `journey` blocks are implicitly closed at EOF.
- declarations outside any view create an implicit `v_container` view.

## 6. Recommended Catalog (UI values)

### 6.1 Node `kind`
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

### 6.2 `protocolId`
- `http`
- `internal-call`
- `grpc`
- `kafka-event`
- `sql`
- `oauth2-token`

### 6.3 `techId`
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

## 7. Complete Example (Multi-View + Hierarchy + Boundary)

```dsl
workspace "Orders" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "orders-api" tech spring-boot
    container worker "fulfillment-worker" tech spring-boot
    db orders "orders-db" tech postgres

    api -> worker : kafka-event "order.created"
    api -> orders : sql "insert order"
  }

  view v_component_api component parent v_container via api {
    component app "CreateOrderService" tech application-service drilldown v_hex_api
    component repo "OrderRepo" tech component
    app -> repo : internal-call "save"
  }

  view v_hex_api hex parent v_component_api via app {
    domain core_domain "OrderDomain" tech domain
  }
}
```

## 8. Checklist for AI DSL Generation

Before importing:
1. `workspace "..." {` exists.
2. each modern view has a unique `viewId`.
3. file contains at least one node.
4. each edge alias exists as a node in the same view.
5. journey steps reference existing edges in the same view.
6. `drilldown` and `parent/via` reference valid view IDs and aliases.
7. `contains` only lists aliases from the same view.
