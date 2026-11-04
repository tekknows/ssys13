const { hashPassword } = require('./password');
const { getSupabaseClient } = require('./supabase.js');
const { resolveSupabaseConfig } = require('./supabase-sync');

async function provisionAdministrator(env = process.env) {
  resolveSupabaseConfig(env);
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.ADMIN_PASSWORD || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid administrator email address.');
  }
  if (password.length < 8) {
    throw new Error('Set ADMIN_PASSWORD to a password with at least 8 characters.');
  }

  const client = getSupabaseClient(env);
  const { data: employee, error: employeeError } = await client
    .from('employees')
    .upsert({
      email,
      role: 'Admin',
      account_role: 'Administrator',
      is_active: true,
    }, { onConflict: 'email' })
    .select('id')
    .single();
  if (employeeError) throw new Error(`Could not provision administrator profile: ${employeeError.message}`);

  const { error: credentialError } = await client
    .from('user_credentials')
    .upsert({
      email,
      employee_id: String(employee.id),
      password_hash: hashPassword(password),
      role: 'Administrator',
      is_active: true,
    }, { onConflict: 'email' });
  if (credentialError) throw new Error(`Could not provision administrator credential: ${credentialError.message}`);

  return { email };
}

if (require.main === module) {
  provisionAdministrator().then(({ email }) => {
    process.stdout.write(`Administrator provisioned: ${email}\n`);
  }).catch((error) => {
    console.error(error.message || 'Administrator provisioning failed.');
    process.exitCode = 1;
  });
}

module.exports = { provisionAdministrator };
