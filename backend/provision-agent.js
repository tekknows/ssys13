const crypto = require('node:crypto');
const { getSupabaseClient } = require('./supabase.js');

async function provisionAgent(deviceId, env = process.env) {
  const normalizedDeviceId = String(deviceId || '').trim();
  if (!normalizedDeviceId || normalizedDeviceId.length > 128) {
    throw new Error('Provide the id of a registered, managed device.');
  }

  const client = getSupabaseClient(env);
  const { data: device, error: deviceError } = await client
    .from('devices')
    .select('id,is_registered,email,mac_address')
    .eq('id', normalizedDeviceId)
    .limit(1)
    .maybeSingle();
  if (deviceError) throw new Error(`Could not verify the registered device: ${deviceError.message}`);
  if (!device || device.is_registered !== true || !device.email || !device.mac_address) {
    throw new Error('The device must be registered and assigned before provisioning an agent.');
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  const { error: credentialError } = await client
    .from('device_agent_credentials')
    .upsert({
      device_id: String(device.id),
      token_hash: tokenHash,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' });
  if (credentialError) {
    throw new Error(`Could not store the agent credential: ${credentialError.message}`);
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
