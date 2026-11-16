"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendAdminReply, updateTicket } from '@/src/lib/adminOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const labels = { pending: 'Menunggu admin', open: 'Menunggu admin', in_progress: 'Diproses', resolved: 'Selesai', closed: 'Ditutup' };
const statuses = ['pending', 'in_progress', 'resolved', 'closed'];
const ticketFields = 'id,user_id,subject,message,status,priority,created_at,updated_at,resolved_at';

export default function AdminTickets() {
  const [client] = useState(createClient);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permitted, setPermitted] = useState(false);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [more, setMore] = useState(false);
  const [threadMore, setThreadMore] = useState(false);
  const threadOffset = useRef(0);
  const request = useRef(null);
  const generation = useRef(0);
  const listGeneration = useRef(0);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (next = 0) => {
    const version = ++listGeneration.current;
    try {
      const { data: allowed, error: denied } = await client.rpc('app_admin_allowed', { p_permission: 'manage_support' });
      if (version !== listGeneration.current) return;
      if (denied || !allowed) { setPermitted(false); throw new Error('Izin chat admin belum tersedia untuk akun ini.'); }
      setPermitted(true);
      let q = client.from('support_tickets').select(ticketFields, { count: 'exact' })
        .order('updated_at', { ascending: false }).order('id', { ascending: false });
      if (status !== 'all') q = status === 'pending' ? q.in('status', ['pending', 'open']) : q.eq('status', status);
      const { data, error: failure, count } = await q.range(next * 50, next * 50 + 49);
      if (failure) throw new Error('Daftar percakapan belum dapat dimuat.');
      const ids = [...new Set(data.map(item => item.user_id))];
      let profiles = [];
      if (ids.length) {
        const result = await client.from('alumni').select('user_id,name,full_name,avatar').in('user_id', ids);
        if (result.error) throw new Error('Identitas pengirim belum dapat dimuat.');
        profiles = result.data;
      }
      if (version !== listGeneration.current) return;
      const mapped = data.map(item => ({ ...item, profile: profiles.find(p => p.user_id === item.user_id) }));
      setTickets(previous => {
        if (!next) return mapped;
        const ids = new Set(previous.map(item => item.id));
        return [...previous, ...mapped.filter(item => !ids.has(item.id))];
      });
      setPage(next); pageRef.current = next; setMore((next + 1) * 50 < count); setError(null);
    } catch (cause) { if (version === listGeneration.current) setError(cause.message); } finally { if (version === listGeneration.current) setLoading(false); }
  }, [client, status]);

  const loadThread = useCallback(async (id, older = false) => {
    const current = ++generation.current;
    const offset = older ? threadOffset.current + 50 : 0;
    const { data, error: failure } = await client.rpc('get_support_thread', { p_ticket_id: id, p_offset: offset });
    if (current !== generation.current || selectedRef.current !== id) return;
    if (failure) throw new Error('Percakapan belum dapat dimuat.');
    setMessages(previous => older ? [...data.messages, ...previous] : data.messages);
    setThreadMore(data.has_more); threadOffset.current = offset;
    setSelected(previous => previous ? { ...previous, ...data.ticket } : data.ticket);
    const last = data.messages.at(-1)?.created_at || data.ticket.created_at;
    if (!older) {
      const read = await client.rpc('mark_support_thread_read', { p_ticket_id: id, p_through: last });
      if (read.error && current === generation.current && selectedRef.current === id) throw new Error('Status baca percakapan belum tersimpan.');
    }
  }, [client]);

  useEffect(() => {
    load();
    const refresh = () => {
      if (!document.hidden && pageRef.current === 0) load();
      if (selectedRef.current && threadOffset.current === 0) loadThread(selectedRef.current).catch(cause => setError(cause.message));
    };
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    const channel = client.channel('admin-ticket-list').on('postgres_changes', {
      event: '*', schema: 'public', table: 'support_tickets',
    }, refresh).subscribe();
    return () => { listGeneration.current++; clearInterval(timer); client.removeChannel(channel); };
  }, [load, loadThread, client]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedRef.current && threadOffset.current === 0 && !document.hidden) loadThread(selectedRef.current).catch(cause => setError(cause.message));
    }, 10000);
    return () => { clearInterval(timer); generation.current = -1; selectedRef.current = null; };
  }, [loadThread]);

  const open = async ticket => {
    selectedRef.current = ticket.id;
    setSelected(ticket); setDraft(''); request.current = null; setMessages([]); setNotes(''); setError(null);
    try {
      await loadThread(ticket.id);
      const { data, error: failure } = await client.from('ticket_internal_notes').select('body').eq('ticket_id', ticket.id).maybeSingle();
      if (failure) throw new Error('Catatan internal belum dapat dimuat.');
      if (selectedRef.current === ticket.id) setNotes(data?.body || '');
    } catch (cause) { if (selectedRef.current === ticket.id) setError(cause.message); }
  };
  const mutate = async values => {
    if (!selected || busy) return;
    const id = selected.id;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await updateTicket(client, id, values);
      if (selectedRef.current !== id) return;
      setSelected(previous => previous?.id === id ? { ...previous, ...result } : previous);
      await load();
      if (selectedRef.current === id) setNotice('Perubahan tersimpan.');
    } catch (cause) { if (selectedRef.current === id) setError(cause.message); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!draft.trim() || !selected || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const id = selected.id;
    request.current ||= crypto.randomUUID();
    const requestId = request.current;
    try {
      await sendAdminReply(client, id, draft, requestId);
      if (selectedRef.current !== id) return;
      setDraft('');
      if (request.current === requestId) request.current = null;
      await loadThread(id); await load();
      if (selectedRef.current === id) setNotice('Balasan terkirim.');
    } catch (cause) { if (selectedRef.current === id) setError(cause.message); } finally { setBusy(false); }
  };
  const filtered = tickets.filter(item => `${item.subject} ${item.profile?.full_name || item.profile?.name || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <Input aria-label="Cari percakapan yang dimuat" placeholder="Cari nama atau judul pada daftar ini" value={query} onChange={e => setQuery(e.target.value)} className="max-w-md" />
      <label className="flex items-center gap-2 text-sm">Status<select value={status} onChange={e => { setLoading(true); setStatus(e.target.value); }} className="rounded border p-2">
        <option value="all">Semua status</option>{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}
      </select></label>
      <Button variant="outline" onClick={() => { load(); if (selectedRef.current) loadThread(selectedRef.current).catch(cause => setError(cause.message)); }}>Muat ulang</Button>
    </div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-900">{error}</p>}
    {notice && <p role="status" className="text-blue-900">{notice}</p>}
    {loading && <p role="status">Memuat percakapan…</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
      <div className="rounded-lg border bg-white">
        {filtered.map(ticket => <button key={ticket.id} onClick={() => open(ticket)} aria-pressed={selected?.id === ticket.id}
          className={`block w-full border-b p-4 text-left hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-800 ${selected?.id === ticket.id ? 'bg-blue-50' : ''}`}>
          <span className="block font-semibold text-blue-950">{ticket.profile?.full_name || ticket.profile?.name || 'Pengguna aplikasi'}</span>
          <span className="mt-1 block truncate text-sm text-slate-700">{ticket.subject}</span>
          <span className="mt-2 block text-xs text-slate-600">{labels[ticket.status] || ticket.status} · {new Date(ticket.updated_at).toLocaleString('id-ID')}</span>
        </button>)}
        {!loading && !error && !filtered.length && <p className="p-5 text-slate-600">Tidak ada percakapan pada pilihan ini.</p>}
        {more && <Button variant="outline" className="m-4" onClick={() => load(page + 1)}>Muat percakapan lainnya</Button>}
      </div>
      {selected ? <section className="min-w-0 space-y-4 rounded-lg border bg-white p-5" aria-label="Percakapan bantuan">
        <h2 className="text-lg font-bold text-blue-950">{selected.profile?.full_name || selected.profile?.name || selected.subject}</h2>
        <div className="flex flex-wrap gap-4">
          <label className="text-sm">Status<select disabled={busy || !permitted} value={selected.status === 'open' ? 'pending' : selected.status} onChange={e => mutate({ status: e.target.value })} className="ml-2 rounded border p-2">{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
          <label className="text-sm">Prioritas<select disabled={busy || !permitted} value={selected.priority} onChange={e => mutate({ priority: e.target.value })} className="ml-2 rounded border p-2">{['low', 'normal', 'high', 'urgent'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <div className="max-h-[520px] space-y-3 overflow-y-auto rounded border p-4" aria-live="polite">
          {threadMore ? <Button variant="outline" onClick={() => loadThread(selected.id, true).catch(cause => setError(cause.message))}>Muat pesan sebelumnya</Button> : <div className="mr-8 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-slate-900">{selected.message}</div>}
          {messages.map(message => <div key={message.id} className={`max-w-[90%] whitespace-pre-wrap rounded-lg p-3 ${message.is_admin_reply ? 'ml-auto bg-blue-900 text-white' : 'mr-auto bg-slate-100 text-slate-900'}`}>
            <p className="mb-1 text-xs font-semibold">{message.is_admin_reply ? 'Admin Satu Teladan' : 'Pengguna'}</p>
            <p>{message.message}</p><p className="mt-2 text-xs opacity-80">{new Date(message.created_at).toLocaleString('id-ID')}</p>
          </div>)}
        </div>
        <label className="block text-sm font-medium" htmlFor="admin-reply">Balasan untuk pengguna</label>
        <Textarea id="admin-reply" disabled={busy} value={draft} maxLength={5000} onChange={e => { setDraft(e.target.value); request.current = null; }} onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') send(); }} rows={3} />
        <Button disabled={busy || !permitted || !draft.trim()} onClick={send}>{busy ? 'Menyimpan…' : 'Kirim balasan'}</Button>
        <hr />
        <label className="block text-sm font-medium" htmlFor="internal-note">Catatan internal · hanya dapat dibaca admin berizin</label>
        <Textarea id="internal-note" disabled={busy} value={notes} maxLength={20000} onChange={e => setNotes(e.target.value)} rows={3} />
        <Button variant="outline" disabled={busy || !permitted} onClick={() => mutate({ admin_notes: notes })}>Simpan catatan</Button>
      </section> : <div className="rounded-lg border p-8 text-slate-600">Pilih percakapan untuk membaca dan membalas pengguna aplikasi.</div>}
    </div>
  </div>;
}
