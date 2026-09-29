# Ótica Central

Sistema de gestão integrado para uma única empresa óptica, construído com Next.js, TypeScript, Tailwind CSS e Supabase.

## Início rápido

1. Copie `.env.example` para `.env.local` e informe URL, chave anônima e a
   `SUPABASE_SERVICE_ROLE_KEY` do Supabase. A última é necessária somente para
   o cadastro de funcionários pelo painel administrativo e nunca deve ser
   enviada ao navegador.
2. Instale dependências com `npm install`.
3. Inicie o Supabase local (`npx supabase start`) e aplique migrations (`npx supabase db reset`), ou vincule um projeto e use `npx supabase db push`.
4. Crie o primeiro usuário conforme [Arquitetura](docs/ARCHITECTURE.md).
5. Execute `npm run dev`.

Antes de publicar, execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.

## Deploy automático

Cada push em `main` executa tipagem, lint, testes, build OpenNext e deploy do Worker.
Configure no GitHub as variáveis `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e os segredos `CLOUDFLARE_ACCOUNT_ID` e
`CLOUDFLARE_API_TOKEN`. O token deve ter somente acesso de edição ao Worker usado
por este projeto.

Para criar contas de funcionários no Worker publicado, registre também a chave
de serviço do Supabase como segredo do Worker — ela não é uma variável pública:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

O segredo já está configurado no Worker de produção. Não o inclua em
`wrangler.jsonc`, em `NEXT_PUBLIC_*` ou no repositório.

## Dados demonstrativos

O arquivo `supabase/seed_demo_15_days.sql` cria, em uma única transação, 12
clientes, 12 produtos com movimentações de estoque e 30 vendas distribuídas nos
últimos 15 dias, com seus pagamentos e lançamentos financeiros. Os registros são
marcados como `DEMO`. O mesmo script inclui 8 consultas concluídas e 10 consultas
futuras, e pode ser executado novamente sem duplicar os dados.

Consulte [Arquitetura](docs/ARCHITECTURE.md) e [Backup e recuperação](docs/BACKUP_AND_RECOVERY.md).
