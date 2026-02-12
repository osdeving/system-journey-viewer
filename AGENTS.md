# AGENTS.md

Constituicao de engenharia para este repositorio (Java + Spring Boot + Hexagonal + Event-Driven).

## Stack e estilo default
- Backend: Java/Spring Boot, arquitetura hexagonal (`application` + `portIn/portOut` + `adapter`).
- Integracao: orientada a eventos por padrao (Kafka/Event Hub API Kafka).
- Exposicao HTTP: controllers existem quando necessario, mas regra de negocio fica fora do adapter.
- Outbound HTTP: clientes com OAuth2 client credentials sao comuns e devem ser tratados como adapters de saida.
- Infra local: Docker-first.

## Regra inegociavel 1: branch sandbox temporaria
Antes de alterar qualquer arquivo:
1. Criar branch temporaria a partir da branch atual:
`git checkout -b tmp/ai/<YYYYMMDD-HHMM>-<slug>`
2. Trabalhar e validar nessa branch.
3. Promover para a branch alvo sem merge commit:
- `cherry-pick` ou `rebase`, sempre fast-forward.
4. Remover branch temporaria ao final.

Mesmo se a branch atual ja for de feature, a branch temporaria continua obrigatoria.

## Regra inegociavel 2: nenhuma mudanca sem teste
Mudou comportamento? Deve existir cobertura:
- teste unitario (dominio/aplicacao), e/ou
- teste de integracao standalone (sem depender de stack externa ja subida).

Se nao for possivel testar:
1. explicar motivo tecnico objetivo,
2. entregar menor cobertura possivel,
3. registrar plano para cobertura faltante.

## Regra inegociavel 3: standalone por padrao
- Preferir Testcontainers para Kafka/Mongo/Elasticsearch.
- Preferir WireMock/MockWebServer para clients HTTP.
- Evitar testes frageis (sem `sleep` arbitrario; usar timeout/poll explicito).

## Regra inegociavel 4: docs e memoria de sessao
No inicio de cada sessao:
1. Ler `docs/AI_STATE.md`.
2. Ler entradas mais recentes de `docs/WORKLOG.md`.

Ao final de cada tarefa:
1. Atualizar `docs/WORKLOG.md`.
2. Atualizar `docs/AI_STATE.md` se houve mudanca de contexto/fluxo/comandos.
3. Atualizar Mermaid/decisoes quando fluxo arquitetural mudou (`docs/DECISIONS.md` e/ou `doc/mermaid/*`).

## Regra inegociavel 5: validar docs em tempo real
Antes de implementar configuracoes nao-triviais ou APIs externas:
- Validar documentacao atual por tool/MCP.
- Se Context7 estiver disponivel, usar Context7 para checar exemplos e contratos atuais.

Aplicar especialmente para:
- Spring Security OAuth2 client credentials,
- Kafka/Event Hub settings,
- Testcontainers,
- Mongo/Elasticsearch,
- Kubernetes/AKS manifests.

## Workflow padrao
1. Planejar (curto): passos + arquivos afetados.
2. Implementar menor mudanca correta.
3. Criar/atualizar testes.
4. Rodar validacoes locais (build/test/lint aplicaveis).
5. Atualizar docs (WORKLOG + Mermaid/decisoes quando necessario).
6. Entregar resumo com comandos de validacao.

## Definition of Done
- [ ] Branch `tmp/ai/*` criada e usada.
- [ ] Codigo compila.
- [ ] Testes adicionados/atualizados.
- [ ] Integracao standalone coberta quando aplicavel.
- [ ] Validacoes locais executadas e verdes.
- [ ] `docs/WORKLOG.md` atualizado.
- [ ] `docs/AI_STATE.md` atualizado se necessario.
- [ ] Mudanca promovida sem merge commit.

## Skills locais
Este repo mantem skills em `skills/` para tarefas recorrentes. Ao detectar aderencia forte de contexto, priorizar uso dessas skills:
- `change-with-tests`
- `add-unit-tests`
- `add-it-tests-testcontainers`
- `implement-http-client-cc`
- `implement-kafka-consumer`
- `expose-rest-controller`
- `update-docs-mermaid`
- `git-sandbox-branch-flow`
- `k8s-validate`
