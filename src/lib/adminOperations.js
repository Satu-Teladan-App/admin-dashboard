export function mutationError(error) {
  if (error?.code === 'PGRST202') return new Error('Operasi admin belum tersedia. Hubungi pengelola untuk menyelesaikan konfigurasi.');
  if (error?.code === '42501') return new Error('Akun ini tidak memiliki izin untuk tindakan tersebut.');
  if (error?.code === '23503') return new Error('Data masih terhubung dengan catatan lain. Periksa dependensinya terlebih dahulu.');
  return new Error(error?.message || 'Perubahan belum dapat disimpan. Coba lagi.');
}

export async function archiveContent(client, table, id) {
  const { data, error } = await client.rpc('admin_archive_content', { p_table: table, p_id: id });
  if (error) throw mutationError(error);
  if (data?.id !== id || data?.archived !== true) throw new Error('Pengarsipan belum terkonfirmasi. Muat ulang lalu periksa hasilnya.');
  return data;
}

export async function updateTicket(client, id, values) {
  const { data, error } = await client.rpc('admin_update_ticket', { p_ticket_id: id, p_values: values });
  if (error) throw mutationError(error);
  if (data?.id !== id) throw new Error('Perubahan tiket belum terkonfirmasi.');
  return data;
}

export async function sendAdminReply(client, ticketId, message, requestId) {
  const { data, error } = await client.rpc('send_admin_chat_message', {
    p_message: message.trim(), p_request_id: requestId, p_ticket_id: ticketId,
  });
  if (error) throw mutationError(error);
  if (data?.ticket_id !== ticketId) throw new Error('Balasan belum terkonfirmasi.');
  return data;
}

export async function confirmedAdminRpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw mutationError(error);
  if (data === null || data === undefined || (typeof data === 'object' && !data.id)) throw new Error('Perubahan belum terkonfirmasi.');
  return data;
}

export async function confirmedRow(query) {
  const { data, error } = await query;
  if (error) throw mutationError(error);
  if (!data?.id) throw new Error('Perubahan belum terkonfirmasi. Muat ulang lalu periksa izin akun.');
  return data;
}
