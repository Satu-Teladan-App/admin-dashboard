export async function getMessageStats(client, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const today = new Date(`${day}T00:00:00+07:00`).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const results = await Promise.all([
    client.from('messages').select('id', { count: 'exact', head: true }),
    client.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', today),
    client.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    client.from('reports').select('id', { count: 'exact', head: true }).not('messages_id', 'is', null),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [totalMessages, todayMessages, recentMessages, reportedMessages] = results.map(r => r.count ?? 0);
  return { totalMessages, todayMessages, recentMessages, reportedMessages };
}
