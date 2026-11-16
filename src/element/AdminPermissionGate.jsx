"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { permissionForPage } from '@/src/lib/adminPagePermissions';
import { createClient } from '@/utils/supabase/client';

export default function AdminPermissionGate({ children }) {
  const path = usePathname();
  const [client] = useState(createClient);
  const [state, setState] = useState({ path: null, status: 'loading' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const permission = permissionForPage(path);
    client.rpc('app_admin_allowed', { p_permission: permission || 'unavailable_page' }).then(({ data, error }) => {
      if (active) setState({ path, status: error ? 'error' : data === true ? 'allowed' : 'denied' });
    }).catch(() => { if (active) setState({ path, status: 'error' }); });
    return () => { active = false; };
  }, [client, path, revision]);
  if (state.path !== path || state.status === 'loading') return <p role="status" className="p-6 text-slate-700">Memeriksa izin halaman…</p>;
  if (state.status === 'allowed') return children;
  return <div className="space-y-3 p-6" role="alert"><p className="text-red-900">{state.status === 'denied' ? 'Akun ini tidak memiliki izin membuka halaman tersebut.' : 'Izin belum dapat diperiksa. Periksa koneksi atau hubungi pengelola dashboard.'}</p>
    <button onClick={() => { setState({ path, status: 'loading' }); setRevision(value => value + 1); }} className="min-h-11 rounded border border-blue-800 px-4 text-blue-900 focus-visible:outline-2">Periksa lagi</button>
  </div>;
}
