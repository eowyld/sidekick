-- Date d'encaissement (jour calendaire local au passage en « payée »), format ISO YYYY-MM-DD
alter table user_invoices
  add column if not exists encaissement_date text;
