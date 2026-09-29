# Backup, recuperação e teste

## Política

1. Gerar semanalmente um dump lógico com `pg_dump` em formato customizado, usando uma conexão direta e credenciais mantidas no cofre operacional, nunca no repositório.
2. Criptografar o arquivo antes do envio para armazenamento externo ao Supabase.
3. Manter 8 cópias semanais e 12 cópias mensais. Ativar versionamento e retenção imutável no destino quando disponível.
4. Registrar data, tamanho, checksum SHA-256 e responsável. Alertar quando o backup ou a verificação falhar.

Exemplo operacional (substitua a URL por variável segura):

```sh
pg_dump --format=custom --no-owner --no-acl --file=otica-YYYY-MM-DD.dump "$DATABASE_URL"
```

## Recuperação

1. Declare incidente, bloqueie gravações e preserve evidências.
2. Crie um projeto/banco PostgreSQL vazio com a mesma versão principal e extensões.
3. Verifique o checksum, descriptografe e restaure com `pg_restore --clean --if-exists --no-owner`.
4. Reaplique configurações Auth, URLs, secrets e publicação Realtime documentadas em `supabase/config.toml`.
5. Valide contagens, FKs, últimas vendas, soma do estoque versus razão de movimentos e lançamentos financeiros vinculados.
6. Execute os testes e um roteiro manual: login por papel, cliente, exame, venda, cancelamento e relatório.
7. Somente então aponte a aplicação para o banco recuperado e reabra gravações.

## Ensaio

Trimestralmente restaure o backup mais recente em ambiente isolado, cronometre RTO, meça a perda contra o RPO semanal e registre o resultado. Um backup sem restauração testada não é considerado válido.
