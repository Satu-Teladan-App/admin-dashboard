"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AdminInboxIndicator() {
  const [client] = useState(createClient);
  const [pending, setPending] = useState(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const permission = await client.rpc('app_admin_allowed', { p_permission: 'manage_support' });
      if (permission.error || permission.data !== true) { if (active) setPending(null); return; }
      const { count, error } = await client.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['pending', 'open']);
      if (active) setPending(error ? null : count);
    };
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [client]);
  return <Link href="/tickets" className="ml-auto inline-flex min-h-11 items-center gap-2 rounded border border-blue-200 px-3 text-sm text-blue-950 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-800">
    Chat Admin{pending !== null && <span className="rounded bg-blue-900 px-2 py-1 text-xs text-white" aria-label={`${pending} percakapan menunggu admin`}>{pending}</span>}
  </Link>;
}
