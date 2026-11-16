"use client";

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { confirmedAdminRpc } from '@/src/lib/adminOperations';
import DefaultLayout from '@/src/layout/DefaultLayout';
import HeaderPage from '@/src/layout/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const labels = { pending: 'Menunggu peninjauan', approved: 'Disetujui, belum berarti terhapus', processing: 'Sedang diproses', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai' };
export default function AccountRequests() {
  const [client] = useState(createClient);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [notice, setNotice] = useState(null);
  const load = useCallback(async (next = 0) => {
    setLoading(true);
    try {
      const { data, error: failure, count } = await client.from('account_deletion_requests')
        .select('id,user_id,status,requested_at,reason,processed_at', { count: 'exact' })
        .order('requested_at', { ascending: false }).order('id', { ascending: false }).range(next * 25, next * 25 + 24);
      if (failure) throw new Error('Permintaan akun belum dapat dimuat.');
      const ids = [...new Set(data.map(row => row.user_id).filter(Boolean))];
      const profiles = ids.length ? await client.from('alumni').select('user_id,name,full_name').in('user_id', ids) : { data: [] };
      if (profiles.error) throw new Error('Identitas pemilik akun belum dapat dimuat.');
      const mapped = data.map(row => ({ ...row, profile: profiles.data.find(profile => profile.user_id === row.user_id) }));
      setRows(previous => next ? [...previous, ...mapped] : mapped); setPage(next); setMore((next + 1) * 25 < count); setError(null);
    } catch (cause) { setError(cause.message); } finally { setLoading(false); }
  }, [client]);
  useEffect(() => { load(); }, [load]);
  const review = async status => {
    if (!selected || busy || !reason.trim()) return;
    setBusy(true); setError(null);
    try {
      await confirmedAdminRpc(client, 'admin_review_account_request', { p_id: selected.id, p_status: status, p_reason: reason });
      setSelected(null); setReason(''); setNotice('Keputusan tersimpan. Persetujuan tidak menandakan akun sudah dihapus.'); await load();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  return <DefaultLayout><HeaderPage>Permintaan Akun</HeaderPage>
    <section className="space-y-5 py-6"><h1 className="text-2xl font-bold text-blue-950">Peninjauan penghapusan akun</h1>
      <p className="max-w-3xl leading-7 text-slate-700">Tinjau permintaan pengguna sebelum eksekusi penghapusan. Persetujuan di halaman ini mencatat keputusan; akun, transaksi dan berkas belum dihapus. Status selesai hanya boleh berasal dari proses penghapusan backend yang benar-benar berhasil.</p>
      <Button variant="outline" onClick={() => load()}>Muat ulang</Button>
      {error && <p role="alert" className="text-red-900">{error}</p>}{notice && <p role="status" className="text-blue-900">{notice}</p>}
      {loading && <p role="status">Memuat permintaan…</p>}
      {rows.map(row => <article key={row.id} className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold text-blue-950">{row.profile?.full_name || row.profile?.name || 'Akun tanpa profil aktif'}</h2>
        <p className="text-sm text-slate-600">{labels[row.status] || row.status} · {new Date(row.requested_at).toLocaleString('id-ID')}</p>
        <p className="whitespace-pre-wrap text-slate-800">{row.reason || 'Tidak ada keterangan tambahan.'}</p>
        {row.status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => { setSelected(row); setReason(''); }}>Tinjau permintaan</Button>}
      </article>)}
      {!loading && !error && !rows.length && <p className="text-slate-700">Belum ada permintaan.</p>}
      {more && <Button variant="outline" disabled={loading} onClick={() => load(page + 1)}>Muat permintaan lainnya</Button>}
      {selected && <section className="space-y-3 rounded border border-blue-300 bg-blue-50 p-5" aria-label="Keputusan peninjauan">
        <label htmlFor="review-reason" className="font-semibold text-blue-950">Alasan keputusan untuk {selected.profile?.full_name || selected.profile?.name || 'akun ini'}</label>
        <Textarea id="review-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} disabled={busy} />
        <div className="flex flex-wrap gap-3"><Button disabled={busy || !reason.trim()} onClick={() => review('approved')}>Setujui peninjauan</Button>
          <Button variant="outline" disabled={busy || !reason.trim()} onClick={() => review('rejected')}>Tolak permintaan</Button>
          <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Batal</Button></div>
      </section>}
    </section>
  </DefaultLayout>;
}
