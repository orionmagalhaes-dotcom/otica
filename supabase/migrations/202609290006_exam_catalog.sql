begin;

insert into public.product_categories(name)
values ('Exames')
on conflict (name) do update set active = true;

alter table public.exams
add column exam_product_id uuid references public.products(id) on delete set null;

create index exams_product_idx on public.exams(exam_product_id) where exam_product_id is not null;

commit;
