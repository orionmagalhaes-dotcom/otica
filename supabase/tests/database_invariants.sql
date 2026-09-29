begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select has_table('public', 'sales', 'sales table exists');
select has_table('public', 'stock_movements', 'stock ledger exists');
select has_function('public', 'complete_sale', array['uuid','uuid','uuid','numeric','text','jsonb','jsonb'], 'atomic sale RPC exists');
select has_function('public', 'cancel_sale', array['uuid','text'], 'atomic cancellation RPC exists');
select col_is_fk('public', 'exams', 'customer_id', 'exams belong to customers');
select col_is_fk('public', 'sale_items', 'sale_id', 'items belong to sales');
select col_is_fk('public', 'financial_entries', 'sale_id', 'financial origin traces to sale');
select policies_are('public', 'sales', array['sales_read'], 'sales cannot be written directly through REST');

select * from finish();
rollback;
