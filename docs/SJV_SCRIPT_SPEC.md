# SJV Script Specification (Reference)

This document defines **SJV Script**, the text format used by System Journey Viewer (SJV).

It is written as an implementer-oriented reference so external tools can build parsers, validators,
compilers, interpreters, or transpilers from the spec alone.

SJV Script models:

- views,
- nodes,
- edges,
- journeys (ordered edge sequences),
- drilldown hierarchy,
- optional UI geometry/style metadata (`metadata ui-layout`).

## 1. Scope and Conformance

This spec describes:

- the concrete syntax (including EBNF),
- lexical rules,
- semantic validation rules,
- normalization/defaulting rules used by the reference implementation,
- parser tolerance notes (where current implementation is permissive).

Conformance levels (recommended):

- `Parser`: reads SJV Script into AST.
- `Validator`: enforces semantic constraints (IDs, references, scope rules).
- `Runtime compiler/interpreter`: builds an executable/renderable model.
- `Canonical formatter/exporter`: emits stable SJV Script from the model.

## 2. Design Goals

- Deterministic parsing.
- Stable edge references even when multiple edges share the same `source -> target`.
- Journey order inferred by line position, not numeric counters.
- Explicit drilldown hierarchy (`parent ... via ...` and node-level `drilldown`).
- Optional UI metadata separated from runtime graph semantics.

## 3. Lexical Rules

## 3.1 Character Encoding

- UTF-8 text is recommended.
- The reference parser processes text line-by-line (`\n` split).

## 3.2 Whitespace

- Leading/trailing whitespace is ignored on each line.
- Empty lines are ignored.
- Statements are line-oriented in the reference parser.

## 3.3 Comments

The reference parser ignores lines whose trimmed content starts with:

- `//`
- `#`

Important:

- Inline comments are **not** supported by the reference parser.
- A line like `node a "A" // comment` is not treated as a valid commented statement.

## 3.4 Identifiers

Many grammar elements use `identifier`, which matches:

- regex: `[A-Za-z0-9_-]+`

Used for:

- view IDs
- node aliases
- edge IDs
- journey IDs
- tech IDs
- protocol IDs

Identifiers do not contain spaces.

## 3.5 String Literals

Double-quoted strings are used for:

- workspace name
- node display name
- note text
- edge label
- journey name

Supported escapes:

- `\\n` newline
- `\\r` carriage return
- `\\t` tab
- `\\"` double quote
- `\\\\` backslash

Unknown escapes are preserved as literal backslash + character by the reference parser.

## 3.6 Numbers

The reference parser accepts decimal numbers in metadata using:

- regex: `-?\d+(\.\d+)?`

Examples:

- `10`
- `-20`
- `0.5`
- `-18`

## 3.7 Color Tokens

Journey colors and metadata node colors are parsed as generic color-like tokens:

- regex: `[#A-Za-z0-9_-]+`

This allows values such as:

- `#2563eb`
- `blue-600`

The reference exporter typically emits hex values.

## 3.8 Keywords

Reserved structural keywords:

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
- `fill`
- `text`

## 4. EBNF (Concrete Syntax)

Notes:

- This EBNF is the **language grammar**.
- The reference parser is line-oriented and requires opening braces on the same line as declarations
  for `workspace`, `view`, `journey`, `metadata ui-layout`, and `metadata ui-layout view`.
- `identifier`, `string`, `number`, and `color-token` are lexical tokens defined in Section 3.

```ebnf
script               = workspace-decl ;

workspace-decl       = "workspace" , string , "{" ,
                       { workspace-item } ,
                       "}" ;

workspace-item       = view-decl | metadata-ui-layout-decl ;

view-decl            = "view" , identifier , view-kind ,
                       [ "parent" , identifier , "via" , identifier ] ,
                       "{" ,
                       { view-item } ,
                       "}" ;

view-kind            = "system-context" | "container" | "component" | "hex" ;

view-item            = node-decl | note-decl | edge-decl | journey-decl ;

node-decl            = node-kind , identifier , string ,
                       [ "tech" , identifier ] ,
                       [ "drilldown" , identifier ] ,
                       [ "contains" , identifier-list ] ;

node-kind            = identifier ;

note-decl            = "note" , identifier , "on" , identifier , string ;

edge-decl            = identifier , ":" , identifier , "->" , identifier ,
                       [ ":" , identifier , [ string ] ] ;

journey-decl         = "journey" , identifier , string ,
                       [ "color" , color-token ] ,
                       "{" ,
                       { journey-step } ,
                       "}" ;

journey-step         = identifier ;

metadata-ui-layout-decl
                     = "metadata" , "ui-layout" , "{" ,
                       { metadata-ui-layout-view } ,
                       "}" ;

metadata-ui-layout-view
                     = "view" , identifier , "{" ,
                       { metadata-ui-layout-item } ,
                       "}" ;

metadata-ui-layout-item
                     = metadata-ui-node | metadata-ui-edge ;

metadata-ui-node     = "node" , identifier ,
                       "at" , number , number ,
                       "size" , number , number ,
                       [ "fill" , color-token ] ,
                       [ "text" , color-token ] ;

metadata-ui-edge     = "edge" , identifier ,
                       "label" , number ,
                       [ "side" , ( "left" | "right" ) ] ,
                       [ "font" , number ] ,
                       [ "angle" , number ] ;

identifier-list      = identifier , { "," , identifier } ;
```

## 5. Structure and Semantics

## 5.1 Workspace

Exactly one top-level `workspace` block is expected.

Example:

```sjv
workspace "Orders Platform" {
  ...
}
```

The reference parser defaults the workspace name to `"Workspace"` before parsing, but a valid script
should provide an explicit `workspace` declaration.

## 5.2 Views

Views define modeling scopes. Each view has:

- an ID,
- a kind,
- a body (nodes, edges, journeys),
- optional parent linkage.

### Supported view kinds

- `system-context`
- `container`
- `component`
- `hex`

Reference parser compatibility behavior:

- Unknown kinds are coerced to `container` by the current parser implementation.
- Validators should treat unknown kinds as errors.

### Parent linkage

```sjv
view v_component_api component parent v_container via api {
  ...
}
```

Meaning:

- this view is a drilldown child of `v_container`,
- the parent relation is anchored on node alias `api` in the parent view.

## 5.3 Nodes

Regular nodes:

```sjv
container saga "Saga Orchestrator" tech spring-boot drilldown v_component_saga
boundary core "Core Services" contains api,worker,orders
```

General form:

```sjv
<kind> <alias> "Display Name" [tech <techId>] [drilldown <viewId>] [contains a,b,c]
```

### Node semantic notes

- `kind` maps to editor/runtime node presets.
- `alias` is the node reference key within its view.
- `tech` is optional and tooling-defined (e.g. `spring-boot`, `postgres`, `oauth2`).
- `drilldown` points to a child view ID.
- `contains` is typically used on `boundary` nodes to group child aliases in the same view.

## 5.4 Notes

Notes are attached context nodes:

```sjv
note note_auth on saga "Requires OAuth scope: interaction:write"
```

Rules:

- `note` attaches to a target node alias in the same view.
- Notes are not regular runtime connectors.
- Notes are not referenced by journeys.

Renderer behavior (SJV app):

- dashed attachment line,
- no arrowhead,
- no standard runtime edge semantics.

## 5.5 Edges

Form:

```sjv
e_create: saga -> core_db : sql "create interaction"
```

Protocol and label are optional:

```sjv
e_ping: app -> api
e_call: app -> api : http
e_call_label: app -> api : http ""
```

Defaults when omitted (reference parser):

- protocol: `http`
- label: `request`

Important:

- Edge identity is the explicit edge ID before `:`.
- There is no `edge` keyword in runtime view blocks.
- Multiple edges between the same two aliases are valid and unambiguous because journeys reference edge IDs.

## 5.6 Journeys

Journeys are ordered edge sequences:

```sjv
journey j_protocol "Protocol Flow" color #2563eb {
  e_create
  e_update
}
```

Rules:

- Journey steps are edge-ID references.
- Order is the line order in the block.
- Numeric step prefixes are not part of SJV Script.
- If `color` is omitted, the reference parser defaults to `#2563eb`.

## 5.7 Optional UI Metadata (`metadata ui-layout`)

This block stores visual/editor metadata without changing runtime graph semantics.

```sjv
metadata ui-layout {
  view v_main {
    node api at 560 220 size 300 130 fill #0f172a text #e2e8f0
    edge e_app_api label 0.72 side right font 13 angle -18
  }
}
```

### Current metadata coverage

Per node:

- `x`, `y`
- `w`, `h`
- `fill` (optional)
- `text` (optional)

Per edge:

- label position
- label side
- label font size
- label angle

Metadata is optional and can be omitted completely.

## 6. Semantic Validation Rules (Normative)

A strict validator/compiler should enforce the following.

## 6.1 Namespace and Uniqueness

- View IDs should be unique in the workspace.
- Node aliases should be unique within a view.
- Edge IDs should be unique within a view.
- Journey IDs should be unique within a view.

Reference importer note:

- The SJV app importer normalizes internal runtime IDs when collisions occur.
- External compilers should prefer explicit validation errors for duplicates.

## 6.2 Reference Validity

- Every edge `fromAlias` and `toAlias` must refer to existing node aliases in the same view.
- Journey steps must reference edge IDs defined in the same view.
- `note ... on <targetAlias>` must reference an existing node alias in the same view.
- `contains` aliases must exist in the same view.
- `drilldown <viewId>` should reference an existing view.
- `parent <viewId> via <alias>` should reference an existing parent view and parent node alias.

## 6.3 Recommended Drilldown Consistency

Two expressions of hierarchy may exist:

- node-level drilldown (`drilldown v_x`)
- child view parent relation (`parent v_parent via alias`)

Recommended:

- keep both coherent and pointing to the same relation.

## 6.4 Notes and Runtime Edges

- Notes should not participate in normal runtime edges.
- Journeys should not include note references.

The SJV app importer/runtime rejects note-to-node runtime edges during editor operations.

## 7. Defaults and Normalization (Reference Implementation)

This section documents behaviors of the current SJV importer/exporter/runtime.

## 7.1 Parsing Defaults

- Missing edge protocol -> `http`
- Missing edge label -> `request`
- Missing journey color -> `#2563eb`
- Missing metadata edge `side` -> `left`

## 7.2 Import-Time Normalization and Clamping

Reference importer (`liteToFullWorkspace`) clamps/normalizes:

- node width/height minimum: `80`
- edge label position: `0.08 .. 0.92`
- edge label font size: `1 .. 64`
- edge label angle: `-180 .. 180`
- journey step numbering is derived from line order (`1..n`)

## 7.3 Export Canonicalization

The SJV exporter (`fullWorkspaceToLiteDsl`) emits canonicalized script with:

- explicit edge IDs in journeys,
- optional `metadata ui-layout` block,
- escaped strings for control chars and quotes,
- semantic edge/journey tokens generated from labels/intent when internal runtime IDs are generic.

## 8. Parser Tolerance vs Strict Validation

The current reference parser is intentionally tolerant in some areas:

- unrecognized non-empty lines may be ignored rather than throwing immediately,
- unknown view kinds are coerced to `container`,
- hard parser errors are currently minimal.

Current hard parser errors:

- no `view` block found
- no node declarations in workspace

For external compilers/interpreters, a stricter mode is recommended:

- fail on unknown statements,
- fail on duplicate IDs/aliases,
- fail on unresolved references,
- fail on unsupported view kinds.

## 9. Import/Sync Precedence (SJV App Behavior)

This section describes the current SJV application behavior (tooling semantics, not core language syntax).

When importing or syncing SJV Script into the app:

- the current app theme is preserved (script import is themed by the current app theme),
- if the script contains `metadata ui-layout`, that metadata is treated as authoritative,
- local per-workspace cached layout metadata is applied only when script metadata is absent.

When `Sync with editor` is enabled:

- valid script edits update the workspace/canvas live,
- workspace edits (Inspector/canvas) regenerate SJV Script text,
- loop guards prevent feedback cycles.

## 10. EBNF Terminal Definitions (Informative)

These terminals reflect the reference parser regexes.

```text
identifier   := [A-Za-z0-9_-]+
number       := -?\d+(\.\d+)?
color-token  := [#A-Za-z0-9_-]+

string       := " { string-char | escape } "
escape       := \n | \r | \t | \" | \\
string-char  := any char except " or \ , unless escaped
```

## 11. Minimal Example

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

## 12. Parallel Edges Example (A -> B twice)

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

Because `journey` references `edgeId`, there is no ambiguity even when both edges connect the same pair.

## 13. Hierarchy + Notes + Metadata Example

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
    e_saga_db_create: saga -> core_db : sql "persist CALL_STARTED"
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
      node api_gateway at 420 120 size 220 120 fill #334155 text #f8fafc
      node cim at 720 120 size 220 120 fill #2563eb text #ffffff
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

## 14. Implementation Notes for External Tool Authors

- Model journeys as ordered edge ID sequences, not as edge endpoint tuples.
- Treat `metadata ui-layout` as optional UI annotation, not runtime graph semantics.
- Preserve unknown future metadata blocks if building a formatter/transpiler (forward compatibility).
- Consider implementing `strict` and `tolerant` parse modes to match both authoring UX and CI validation needs.
