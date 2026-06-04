-- Chat deletes: authors can delete their own messages; admins can delete any team message.

drop policy if exists "author deletes own messages" on public.chat_messages;
drop policy if exists "author or admin deletes messages" on public.chat_messages;

create policy "author or admin deletes messages" on public.chat_messages for delete
  using (author_id = auth.uid() or public.is_admin());
