# Ótica Central

Sistema de gestão integrado para uma única empresa óptica, construído com Next.js, TypeScript, Tailwind CSS e Supabase.

## Início rápido

1. Copie `.env.example` para `.env.local` e informe URL e chave anônima do Supabase.
2. Instale dependências com `npm install`.
3. Inicie o Supabase local (`npx supabase start`) e aplique migrations (`npx supabase db reset`), ou vincule um projeto e use `npx supabase db push`.
4. Crie o primeiro usuário conforme [Arquitetura](docs/ARCHITECTURE.md).
5. Execute `npm run dev`.

Antes de publicar, execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.

Consulte [Arquitetura](docs/ARCHITECTURE.md) e [Backup e recuperação](docs/BACKUP_AND_RECOVERY.md).
