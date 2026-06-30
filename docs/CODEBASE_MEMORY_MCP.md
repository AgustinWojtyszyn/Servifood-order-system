# codebase-memory-mcp

## Que es

`codebase-memory-mcp` es un servidor MCP local que indexa un repositorio y expone un knowledge graph del codigo. Codex puede usar ese grafo para buscar simbolos, rutas, relaciones entre funciones, snippets y vistas de arquitectura sin depender solamente de busquedas de texto.

Repositorio oficial: https://github.com/DeusData/codebase-memory-mcp

## Uso en ServiFood

En este repo se usa solo como ayuda local para exploracion tecnica. No forma parte del build de Vite, no se despliega en Render, no toca Supabase en produccion y no modifica Edge Functions, crons ni variables reales de entorno.

El objetivo es que Codex entienda mejor la estructura de la app de pedidos ServiFood antes de cambiar codigo.

## Instalacion

En este entorno se detecto WSL2/Linux, por eso se uso el instalador Linux oficial con variante UI:

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh -o /tmp/codebase-memory-mcp-install.sh
bash /tmp/codebase-memory-mcp-install.sh --ui
```

El instalador dejo el binario en:

```text
/home/aggustin/.local/bin/codebase-memory-mcp
```

Si `~/.local/bin` no esta en el `PATH` de la terminal actual, usar la ruta absoluta o recargar la shell:

```bash
source ~/.zshrc
```

En Windows nativo, usar PowerShell y no Git Bash para instalar:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.ps1" -OutFile "$env:TEMP\codebase-memory-mcp-install.ps1"
Test-Path "$env:TEMP\codebase-memory-mcp-install.ps1"
powershell -ExecutionPolicy Bypass -File "$env:TEMP\codebase-memory-mcp-install.ps1" --ui
```

Si la variante UI no pudiera instalarse automaticamente, revisar el README oficial y reinstalar con el binario UI publicado en Releases.

## Verificacion

```bash
/home/aggustin/.local/bin/codebase-memory-mcp --version
/home/aggustin/.local/bin/codebase-memory-mcp config list
```

Resultado verificado en esta maquina:

```text
codebase-memory-mcp 0.8.1
auto_index = true
auto_index_limit = 50000
```

## Integracion con Codex y MCP

El instalador detecto y configuro Codex CLI de forma global en el usuario:

```text
~/.codex/config.toml
~/.codex/AGENTS.md
```

Tambien configuro VS Code en:

```text
~/.config/Code/User/mcp.json
```

La entrada MCP de Codex apunta a:

```toml
[mcp_servers.codebase-memory-mcp]
command = "/home/aggustin/.local/bin/codebase-memory-mcp"
```

Para pedirle a Codex que indexe o refresque este proyecto:

```text
Index this project with codebase-memory-mcp
```

Herramientas MCP utiles:

- `index_repository`
- `search_graph`
- `query_graph`
- `trace_path`
- `get_code_snippet`
- `get_graph_schema`
- `get_architecture`
- `search_code`
- `list_projects`
- `index_status`

## Auto-indexado

Se activo con:

```bash
/home/aggustin/.local/bin/codebase-memory-mcp config set auto_index true
```

## Indexar este repo

Comando usado:

```bash
/home/aggustin/.local/bin/codebase-memory-mcp cli index_repository '{"repo_path":"/home/aggustin/.vscode/food-order-app"}'
```

Resultado verificado:

```text
project: home-aggustin-.vscode-food-order-app
status: indexed / ready
nodes: 13339
edges: 35132
```

Consultar estado:

```bash
/home/aggustin/.local/bin/codebase-memory-mcp cli list_projects '{}'
/home/aggustin/.local/bin/codebase-memory-mcp cli index_status '{"project":"home-aggustin-.vscode-food-order-app"}'
```

Nota: el primer indexado incluyo artefactos locales existentes de `.unlighthouse`. Si se quiere un grafo mas limpio, borrar o ignorar esos reportes locales antes de reindexar.

## UI visual

La variante UI quedo disponible y fue probada en:

```bash
/home/aggustin/.local/bin/codebase-memory-mcp --ui=true --port=9749
```

Abrir:

```text
http://localhost:9749
```

La prueba local respondio `HTTP 200` con la pagina `Codebase Memory - Graph`. No dejar el proceso corriendo si no se esta usando.

## Que no debe tocar

Para este proyecto, `codebase-memory-mcp` debe quedar como herramienta local de asistencia. No debe modificar ni requerir cambios en:

- Logica de pedidos.
- Componentes funcionales.
- Edge Functions.
- SQL o migraciones.
- `package.json` o `package-lock.json`.
- Variables reales de entorno.
- Render, Supabase, crons o configuracion de deploy.

Los artefactos locales generados por la herramienta deben quedar ignorados por Git.
