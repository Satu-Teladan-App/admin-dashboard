import { createClient } from 'npm:@supabase/supabase-js@2.90.1';
import { dispatchPushBatch } from './dispatch.mjs';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (
    !secret || secret.length < 32 ||
    request.headers.get('authorization') !== `Bearer ${secret}`
  ) return new Response('Unauthorized', { status: 401 });
  const environment = Deno.env.get('PUSH_ENVIRONMENT');
  const projectId = Deno.env.get('PUSH_PROJECT_ID');
  const accessToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (
    !environment ||
    !['development', 'preview', 'production'].includes(environment) ||
    !projectId || !accessToken || !url || !key
  ) {
    return new Response('Push configuration incomplete', { status: 503 });
  }
  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return Response.json(
      await dispatchPushBatch(db, { environment, projectId, accessToken }),
    );
  } catch {
    // Never include device tokens, message content or provider response bodies in logs.
    return new Response('Dispatch failed; inspect delivery state', {
      status: 500,
    });
  }
});
