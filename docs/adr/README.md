# Architectuurbeslissingen (ADR's)

Elke richtinggevende technische beslissing wordt vastgelegd als een Architecture Decision Record: context, afweging, beslissing en consequenties. ADR's zijn genummerd en onveranderlijk; een beslissing herzien gebeurt met een nieuwe ADR die de oude vervangt (status "vervangen door ADR-XXXX").

Statussen: **voorgesteld** (wacht op bekrachtiging door de stuurgroep) → **aanvaard** → eventueel **vervangen**.

| Nr | Titel | Status |
|---|---|---|
| [0001](0001-stackkeuze.md) | Stackkeuze MVP: TypeScript-monorepo, Fastify, PostgreSQL met RLS | voorgesteld |
| [0002](0002-datatoegang.md) | Datatoegang: postgres.js met RLS-transactiehelper | voorgesteld |
| [0003](0003-authenticatie.md) | Authenticatie via OIDC-tokens; autorisatie uit de databankrollen | voorgesteld |
| [0004](0004-scheduler.md) | Nachtelijke herberekening: in-proces planner, geen extra infrastructuur | voorgesteld |
| [0005](0005-kanaal.md) | Kanaal: Chrome-extensie eerst, op een kanaalneutrale inbox-API | aanvaard |
