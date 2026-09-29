# Arquitetura e decisões

## Limites do sistema

A aplicação atende uma única empresa. Não existem organizações, planos, `tenant_id` ou filtros de locatário. O frontend Next.js usa somente a chave anônima do Supabase e a sessão do usuário. Não há `service_role` no bundle ou nas variáveis esperadas pela aplicação.

## Autorização

Os papéis `admin`, `manager` e `employee` são ligados a permissões granulares por `role_permissions`. Toda política RLS consulta `current_user_has_permission`, que também exige perfil ativo. A interface esconde áreas sem acesso para reduzir ruído, mas a autorização efetiva está no PostgreSQL.

Contas Auth novas devem ser criadas no painel administrativo do Supabase. O trigger cria um perfil inativo como funcionário. Um administrador ativa a conta e escolhe o papel em **Acessos**. Isso evita manter uma chave privilegiada no servidor web.

Para o primeiro acesso, crie o usuário no painel e execute uma única vez no SQL Editor:

```sql
update public.profiles
set role = 'admin', active = true
where id = (select id from auth.users where email = 'administrador@empresa.com');
```

## Integridade transacional

- `complete_sale` bloqueia os produtos em ordem estável, relê preços/custos, valida estoque e pagamento, grava venda, itens, pagamentos, movimentos e receita na mesma transação.
- `idempotency_key` impede venda duplicada em reenvios ou clique repetido.
- `cancel_sale` é idempotente, devolve o saldo, registra movimentos inversos, cancela a receita e cria o estorno.
- um trigger impede atualização direta do saldo de produto; somente funções de movimento habilitam a alteração durante a transação.
- FKs `restrict`, checks e índices únicos impedem registros órfãos, valores negativos e duplicidade de origem financeira.

## Realtime

Somente `exams` e `products` estão na publicação Realtime. A agenda e o estoque atualizam a tela e removem o canal no cleanup do componente. Relatórios, auditoria e cadastros não mantêm subscriptions.

## LGPD

O modelo coleta dados de contato necessários, não registra senhas ou tokens e remove documento e observações dos snapshots de auditoria. CPF é único quando informado. Acesso a funcionários, finanças, relatórios e auditoria é limitado à gestão. Solicitações de correção podem ser atendidas pelos formulários; anonimização/eliminação deve respeitar retenção fiscal e referências de vendas.
