const crypto = require('node:crypto');
const { resolveSupabaseConfig } = require('./supabase-sync');

async function provisionAgent(deviceId, env = process.env) {
  const normalizedDeviceId = String(deviceId || '').trim();
  if (!normalizedDeviceId || normalizedDeviceId.length > 128) {
    throw new Error('Provide the id of a registered, managed device.');
  }

  const config = resolveSupabaseConfig(env);
  const deviceUrl = new URL('/rest/v1/devices', config.url);
  deviceUrl.searchParams.set('id', `eq.${normalizedDeviceId}`);
  deviceUrl.searchParams.set('select', 'id,is_registered,email,mac_address');
  deviceUrl.searchParams.set('limit', '1');
  const deviceResponse = await fetch(deviceUrl, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  });
  if (!deviceResponse.ok) {
    throw new Error(`Could not verify the registered device (${deviceResponse.status}).`);
  }
  const devices = await deviceResponse.json();
  const device = Array.isArray(devices) ? devices[0] : null;
  if (!device || device.is_registered !== true || !device.email || !device.mac_address) {
    throw new Error('The device must be registered and assigned before provisioning an agent.');
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  const credentialUrl = new URL('/rest/v1/device_agent_credentials', config.url);
  credentialUrl.searchParams.set('on_conflict', 'device_id');
  const credentialResponse = await fetch(credentialUrl, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      device_id: String(device.id),
      token_hash: tokenHash,
      is_active: true,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!credentialResponse.ok) {
    const detail = await credentialResponse.text();
    throw new Error(`Could not store the agent credential (${credentialResponse.status}): ${detail}`);
  }

  return {
    deviceId: String(device.id),
    token,
  };
}

if (require.main === module) {
  provisionAgent(process.argv[2]).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch((error) => {
    console.error(error.message || 'Agent provisioning failed.');
    process.exitCode = 1;
  });
}

module.exports = { provisionAgent };
