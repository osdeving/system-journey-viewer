# DSL LITE Spec (System Journey Viewer)

Especificacao oficial da DSL LITE usada no editor.

Objetivo:
- dar um contrato claro para humanos e IAs gerarem DSL valida;
- documentar limites atuais (especialmente hierarquia e drilldown).

Status:
- versao atual da implementacao: parser/conversor em `apps/web/src/dsl-lite/*`
- esta spec descreve o comportamento atual do codigo, nao uma visao futura.

## 1. Visao geral (human readable)

A DSL LITE modela **uma view logica** com:
- nodes
- edges
- journeys (passos sobre edges)

Estrutura base:

```dsl
workspace "Nome Workspace" {
  view container {
    container api "API Pedidos" tech spring-boot
    db orders "orders-db" tech postgres
    api -> orders : sql "insert order"
    journey "Fluxo A" color #2563eb {
      1: api -> orders
    }
  }
}
```

## 2. EBNF

```ebnf
dsl              = ws, workspaceDecl, ws ;

workspaceDecl    = "workspace", ws1, string, ws, "{", ws, viewDecl, ws, "}" ;
viewDecl         = "view", ws1, viewKind, ws, "{", ws, { statement, ws }, "}" ;

statement        = nodeDecl | edgeDecl | journeyDecl ;

nodeDecl         = kind, ws1, alias, ws1, string, [ ws1, "tech", ws1, techId ] ;
edgeDecl         = alias, ws, "->", ws, alias,
                   [ ws, ":", ws, protocolId, [ ws1, string ] ] ;
journeyDecl      = "journey", ws1, string, [ ws1, "color", ws1, colorToken ],
                   ws, "{", ws, { journeyStep, ws }, "}" ;
journeyStep      = integer, ws, ":", ws, alias, ws, "->", ws, alias ;

viewKind         = "system-context" | "container" | "component" | "hex" ;
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
```

## 3. Regras semanticas

### 3.1 Workspace e view
- `workspace "..." {` define nome do workspace.
- `view <kind> {` define o tipo da view.
- `view` desconhecida cai para `container`.

### 3.2 Nodes
- Formato: `<kind> <alias> "Nome" [tech <techId>]`
- `alias` deve ser unico para referenciacao de edge.
- `kind` desconhecido e convertido com fallback para preset `container`.
- `techId` desconhecido nao quebra parse; o node fica sem tech resolvida.

### 3.3 Edges
- Formato: `<fromAlias> -> <toAlias> [: <protocolId> ["Label"]]`
- Se protocolo/label forem omitidos:
  - protocolo = `http`
  - label = `request`
- Edge com alias inexistente e descartada na conversao para FULL.

### 3.4 Journeys
- Formato:
  - `journey "Nome" [color <token>] { ... }`
  - passo: `<n>: <fromAlias> -> <toAlias>`
- `color` default: `#2563eb`.
- Passo de jornada so e mantido se existir edge correspondente `fromAlias->toAlias`.

### 3.5 Validacao minima
- DSL sem node gera erro:
  - `DSL LITE invalida: nenhum node encontrado.`

## 4. Catalogo recomendado (valores aceitos na UI)

### 4.1 `kind` de node (presets atuais)
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

### 4.2 `protocolId` (presets atuais)
- `http`
- `internal-call`
- `grpc`
- `kafka-event`
- `sql`
- `oauth2-token`

### 4.3 `techId` (presets atuais)
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

## 5. Hierarquia, drilldown e multiplas views

Esta e a parte mais importante para evitar erro de IA.

### 5.1 O que a DSL LITE atual NAO representa
- Nao existe sintaxe para:
  - multiplas `view` no mesmo documento com escopo correto;
  - relacao pai-filho entre views;
  - `drilldownRef` (duplo clique para entrar em outra view).

### 5.2 Comportamento real do import/export hoje
- `Exportar view atual` exporta **somente a view corrente** para DSL.
- `Importar DSL` cria workspace FULL com **uma unica view** (`v_<viewKind>`) e substitui o workspace atual.
- Resultado: ao importar DSL LITE, os nodes nao ganham `drilldownRef` automaticamente.

### 5.3 Resposta objetiva para "cada view tem DSL separada?"
- **Sim, na pratica atual cada DSL LITE representa uma view por vez.**
- Para manter hierarquia completa (Container -> Component -> Hex), a DSL LITE sozinha nao preserva esses links hoje.

## 6. Regras de tolerancia do parser (importante para IA)

- Linhas vazias sao ignoradas.
- Linhas iniciando com `//` ou `#` sao ignoradas.
- Linhas nao reconhecidas sao ignoradas (nao causam erro por si).
- Se `journey` abrir e nao fechar, ela e fechada implicitamente no fim do arquivo.

## 7. Exemplo valido (referencia)

```dsl
workspace "Pedidos" {
  view container {
    container api "ms-pedidos" tech spring-boot
    queue kafka "Kafka" tech kafka
    db orders "orders-db" tech postgres

    api -> kafka : kafka-event "pedido.criado"
    api -> orders : sql "insert order"
    api -> orders

    journey "Fluxo A" color #2563eb {
      1: api -> kafka
      2: api -> orders
    }
  }
}
```

## 8. Checklist para usar com IA geradora

Antes de importar, valide:
1. Existe `workspace "..." {`.
2. Existe exatamente uma `view ... {`.
3. Ha pelo menos 1 node.
4. Todos os aliases de edge existem em nodes.
5. Todos os passos de journey referenciam pares `from -> to` que existem em edges.
6. `kind`, `protocolId` e `techId` estao no catalogo recomendado.
