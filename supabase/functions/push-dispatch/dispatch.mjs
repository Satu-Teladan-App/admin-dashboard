const endpoint = 'https://exp.host/--/api/v2/push';

export async function dispatchPushBatch(db, config, request = fetch) {
  let processed = 0;
  for (const receipts of [true, false]) {
    const { data: jobs, error } = await db.rpc('claim_push_jobs', {
      p_environment: config.environment,
      p_project: config.projectId,
      p_receipts: receipts,
    });
    if (error) throw new Error('claim_failed');
    if (!jobs?.length) continue;
    const finish = async (job, patch) => {
      const { error: updateError } = await db.from('push_deliveries').update(
        patch,
      )
        .eq('id', job.id).eq('lease_id', job.lease_id).eq('status', 'sending');
      if (updateError) throw new Error('delivery_update_failed');
    };
    const retry = (job) => ({
      status: job.attempts >= 5 ? 'failed' : 'queued',
      next_attempt_at: new Date(
        Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000,
      ).toISOString(),
    });
    let response;
    try {
      response = await request(
        `${endpoint}/${receipts ? 'getReceipts' : 'send'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify(
            receipts
              ? { ids: jobs.map((job) => job.receipt_id) }
              : jobs.map((job) => ({
                to: job.token,
                title: job.title,
                body: job.body,
                sound: 'default',
                channelId: 'updates',
                ttl: Math.max(
                  1,
                  Math.min(
                    3600,
                    Math.floor(
                      (new Date(job.expires_at).getTime() - Date.now()) / 1000,
                    ),
                  ),
                ),
                data: { notification_id: job.recipient_id },
              })),
          ),
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      for (const job of jobs) {
        await finish(
          job,
          receipts
            ? {
              status: 'receipt',
              next_attempt_at: new Date(Date.now() + 60000).toISOString(),
            }
            : { status: 'unknown', error_code: 'network_outcome_unknown' },
        );
      }
      continue;
    }
    if (!response.ok) {
      for (const job of jobs) {
        await finish(job, {
          ...(receipts
            ? {
              status: 'receipt',
              next_attempt_at: new Date(Date.now() + 60000).toISOString(),
            }
            : response.status === 429 || response.status >= 500
            ? retry(job)
            : { status: 'failed' }),
          error_code: `http_${response.status}`,
        });
      }
      continue;
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      for (const job of jobs) {
        await finish(job, {
          status: receipts ? 'receipt' : 'unknown',
          error_code: 'invalid_response',
          next_attempt_at: new Date(Date.now() + 60000).toISOString(),
        });
      }
      continue;
    }
    for (let index = 0; index < jobs.length; index++) {
      const job = jobs[index];
      const item = receipts
        ? payload.data?.[job.receipt_id]
        : payload.data?.[index];
      if (!item) {
        await finish(job, {
          status: receipts ? 'receipt' : 'unknown',
          error_code: 'missing_result',
          next_attempt_at: new Date(Date.now() + 60000).toISOString(),
        });
      } else if (item.status === 'ok') {
        await finish(
          job,
          receipts ? { status: 'delivered', error_code: null } : item.id
            ? {
              status: 'receipt',
              receipt_id: item.id,
              sent_at: new Date().toISOString(),
              error_code: null,
              next_attempt_at: new Date(Date.now() + 15 * 60000).toISOString(),
            }
            : { status: 'unknown', error_code: 'missing_ticket' },
        );
      } else {
        const code = typeof item.details?.error === 'string'
          ? item.details.error.slice(0, 80)
          : 'provider_error';
        if (code === 'DeviceNotRegistered') {
          const { error: deviceError } = await db.from('push_devices').update({
            active: false,
          }).eq('id', job.device_id).eq('token', job.token);
          if (deviceError) throw new Error('device_update_failed');
        }
        await finish(job, {
          ...(code === 'MessageRateExceeded'
            ? retry(job)
            : { status: 'failed' }),
          error_code: code,
        });
      }
      processed++;
    }
  }
  return { processed };
}
