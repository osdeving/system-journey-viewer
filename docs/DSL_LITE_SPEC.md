# DSL LITE Spec (System Journey Viewer)

Especificacao oficial da DSL LITE usada no editor.

Objetivo:
- dar um contrato claro para humanos e IAs gerarem DSL valida;
- documentar a semantica real de hierarquia, drilldown e fronteiras.

Status:
- fonte da verdade: `apps/web/src/dsl-lite/parser.ts` e `apps/web/src/dsl-lite/convert.ts`
- esta spec descreve o comportamento atual da implementacao.

## 1. Visao geral (human readable)

A DSL LITE agora suporta **arquivo unico com multiplas views**.

Cada view pode declarar:
- nodes
- edges
- journeys
- parent/via (hierarquia)

Nodes podem declarar:
- `drilldown <viewId>` (pai aponta para filho)
- `contains a,b,c` (fronteira agrupando aliases da mesma view)

Exemplo curto:

```dsl
workspace "Pedidos" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "ms-pedidos" tech spring-boot drilldown v_component_api
    container worker "ms-fulfillment" tech spring-boot
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

workspaceDecl    = "workspace", ws1, string, ws, "{", ws, { viewDecl, ws }, "}" ;

viewDecl         = modernViewDecl | legacyViewDecl ;
modernViewDecl   = "view", ws1, viewId, ws1, viewKind,
                   [ ws1, "parent", ws1, viewId, ws1, "via", ws1, alias ],
                   ws, "{", ws, { statement, ws }, "}" ;
legacyViewDecl   = "view", ws1, viewKind, ws, "{", ws, { statement, ws }, "}" ;

statement        = nodeDecl | edgeDecl | journeyDecl ;

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

string           = "\"", { stringChar }, "\"" ;
stringChar       = ? any char except " ? ;

ws               = { " " | "\t" | "\r" | "\n" } ;
ws1              = ( " " | "\t" ), { " " | "\t" } ;
ws?              = { " " | "\t" } ;
```

## 3. Regras semanticas

### 3.1 Workspace e views
- `workspace "..." { ... }` define nome do workspace.
- Pode haver varias views no mesmo arquivo.
- Formato recomendado de view:
  - `view <viewId> <viewKind> { ... }`
- Formato legado continua aceito:
  - `view <viewKind> { ... }`
  - nesse caso o parser gera `viewId` automaticamente (`v_<kind>`).

### 3.2 Escopo por view
- `alias` de node e local da view.
- edges e journey steps referenciam aliases da mesma view.
- edge com alias inexistente e descartada na conversao.

### 3.3 Nodes
- Formato:
  - `<kind> <alias> "Nome" [tech <techId>] [drilldown <viewId>] [contains a,b,c]`
- `kind` desconhecido: fallback para preset `container`.
- `techId` desconhecido: nao quebra parse; node pode ficar sem tech resolvida.

### 3.4 Drilldown e hierarquia
- Existem duas formas de ligar pai/filho:
  1. no node do pai: `drilldown <viewIdFilha>`
  2. na view filha: `parent <viewIdPai> via <aliasDoNodePai>`
- Na conversao para modelo FULL:
  - a UI usa `node.drilldownRef` para abrir drilldown no double-click;
  - `parent/via` tambem seta esse `drilldownRef` automaticamente no node do pai.
- Em conflito entre regras, a implementacao evita sobrescrever `drilldownRef` ja definido para outro alvo.

### 3.5 Fronteira por grupo (`contains`)
- Use em node de `kind boundary`:
  - `boundary core "Core Services" contains api,worker,orders`
- Efeito no import:
  - `boundary.children` recebe os nodes listados;
  - bounds da fronteira sao ajustados para envolver o grupo com padding.
- Efeito na UI:
  - fronteira e renderizada como boundary normal, ja envolvendo os filhos.

### 3.6 Edges
- Formato:
  - `<fromAlias> -> <toAlias> [: <protocolId> ["Label"]]`
- defaults:
  - protocolo = `http`
  - label = `request`

### 3.7 Journeys
- Formato:
  - `journey "Nome" [color <token>] { ... }`
  - passo: `<n>: <fromAlias> -> <toAlias>`
- `color` default: `#2563eb`
- passo so e mantido se houver edge correspondente `fromAlias->toAlias`.

### 3.8 Validacao minima
- se total de nodes no arquivo for zero:
  - erro `DSL LITE inválida: nenhum node encontrado.`

## 4. Import/export no editor

- `Exportar workspace completo`:
  - gera um unico arquivo DSL com todas as views.
  - inclui `parent ... via ...` quando encontra relacao de drilldown.
- `Importar DSL`:
  - reconstrui o workspace FULL com multiplas views.
  - aplica drilldown e fronteiras de grupo.
- a sincronizacao continua manual:
  - editar textarea nao atualiza canvas ate clicar `Importar DSL`.

## 5. Regras de tolerancia do parser

- linhas vazias sao ignoradas.
- linhas iniciando com `//` ou `#` sao ignoradas.
- linhas nao reconhecidas sao ignoradas (nao causam erro por si).
- se `journey` abrir e nao fechar, ela e fechada implicitamente no fim.
- se houver declaracoes fora de bloco de view, o parser cria uma view implicita `v_container`.

## 6. Catalogo recomendado (valores da UI)

### 6.1 `kind` de node
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

## 7. Exemplo completo (multi-view + hierarquia + fronteira)

```dsl
workspace "Pedidos" {
  view v_container container {
    boundary core "Core Services" contains api,worker,orders
    container api "ms-pedidos" tech spring-boot
    container worker "ms-fulfillment" tech spring-boot
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

## 8. Checklist para IA geradora

Antes de importar:
1. Existe `workspace "..." {`.
2. Toda view tem `viewId` unico (quando usar sintaxe moderna).
3. Ha pelo menos 1 node no arquivo.
4. Em cada view, aliases usados em edges existem como nodes.
5. Steps de journey referenciam edges existentes na mesma view.
6. `drilldown` e `parent/via` apontam para `viewId`/alias existentes.
7. Para fronteira de grupo, `contains` usa aliases da mesma view.
