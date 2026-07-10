# Repository Refactoring Plan

## Current Structure
The current repository consists of a monolithic structure where all logic is contained within a single file:
- `server.js`: Contains Express setup, environment configuration, Supabase persistence, Jules API interactions, REST endpoints, and MCP SDK transport routing logic.
- `package.json`: Contains project metadata and dependencies.
- `.gitignore`: Specifies intentionally untracked files to ignore.

## Recommended Structure
As the project grows, it is highly recommended to split `server.js` into smaller, well-defined modules with clear separation of concerns:

```text
├── src/
│   ├── index.js              # Entry point, Express app setup, and middleware
│   ├── config/
│   │   ├── env.js            # Environment variables parsing and validation
│   │   └── supabase.js       # Supabase client initialization
│   ├── services/
│   │   ├── jules.service.js  # Jules API interactions
│   │   └── session.service.js# Supabase persistence logic for sessions
│   ├── routes/
│   │   ├── rest.routes.js    # Express REST API routes
│   │   └── mcp.routes.js     # MCP Server endpoints (/mcp)
│   ├── mcp/
│   │   ├── tools.js          # Definitions for MCP tools
│   │   └── handler.js        # JSON-RPC processing and tool calling logic
│   └── utils/
│       └── error.js          # Error formatting and standard responses
├── docs/
│   └── repository-refactor-plan.md # This document
├── package.json
└── .gitignore
```

## Migration Strategy
1. **Initialize the structure**: Create the target directory tree (`src/`, `src/config/`, `src/services/`, etc.).
2. **Extract Configuration**: Move `dotenv` configuration, environment defaults, and `supabase` initialization to `src/config/`.
3. **Extract Services**: Move `callJules`, `createJulesSession`, `getJulesSession`, and `continueJulesSession` to `src/services/jules.service.js`. Move persistence functions to `src/services/session.service.js`.
4. **Extract MCP Logic**: Move tool definitions and JSON-RPC dispatch logic to `src/mcp/`.
5. **Extract Routes**: Move the express route definitions to `src/routes/` and hook them up to the main app.
6. **Integrate**: Assemble everything in `src/index.js` (formerly `server.js`).
7. **Update package.json**: Change the `start` script to point to `src/index.js`.

## Breaking Change Analysis
- **API Endpoints**: No breaking changes to the REST or MCP endpoints. All paths and behaviors will remain identical.
- **Entry Point**: The `main` entry in `package.json` needs to be updated to `src/index.js`, and the `start` script changes from `node server.js` to `node src/index.js`. Deployment scripts will need to be updated.
- **Environment**: No breaking changes to existing environment variables.

## File Movement Plan
- Rename `server.js` conceptually to `src/index.js` and extract out:
  - Configuration logic -> `src/config/`
  - Third-party interactions (Supabase, Jules API) -> `src/services/`
  - Express endpoints -> `src/routes/`
  - MCP specific handling -> `src/mcp/`

## Future Module Layout
- Controllers could be introduced if route logic becomes too thick.
- A `tests/` directory mirroring `src/` should be established for unit and integration testing.
- `types/` or `interfaces/` could be added if migrating to TypeScript or using JSDoc type safety.

## Risk Assessment
- **Low Risk**: This is purely a structural refactoring without adding new features or changing underlying business logic.
- **Main Risk**: Accidental loss of context or broken imports.
  - *Mitigation*: Comprehensive manual testing of endpoints (both REST and MCP) and potentially writing basic API tests before starting the refactor.
- **ES Module initialization risks**: Since the project uses ES Modules (`"type": "module"` in `package.json`), care must be taken with top-level await and imports. Dynamic imports or file resolution (`__dirname` is not available by default) might break.
- **dotenv initialization risks**: `dotenv.config()` must be called as early as possible in the application lifecycle (e.g. at the very top of `src/index.js` or in a dedicated `config.js` imported first) to ensure environment variables are available to all modules.

## Estimated Implementation Phases
- **Phase 1 (Preparation)**: Create directories, set up basic exports/imports.
- **Phase 2 (Config & Services)**: Move and verify configuration and service layers independently.
- **Phase 3 (Routing & Entrypoint)**: Move Express routes and MCP handlers, finalize `src/index.js`.
- **Phase 4 (Testing & Cleanup)**: Run local test queries against Jules and Supabase to verify functionality. Delete the legacy `server.js`.
