const { hashPassword } = require('./password');
const { getSupabaseClient } = require('./supabase.js');
const { resolveSupabaseConfig } = require('./supabase-sync');
const readline = require('node:readline');

async function promptForPassword() {
  const input = process.stdin;
  const output = process.stderr;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('ADMIN_PASSWORD is not set. Run this command in an interactive terminal to enter it securely.');
  }

  readline.emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  output.write('Enter a new administrator password (hidden, at least 8 characters): ');

  return new Promise((resolve, reject) => {
    let password = '';
    const cleanup = () => {
      input.removeListener('keypress', onKeypress);
      input.setRawMode(false);
      output.write('\n');
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Password entry cancelled.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(password);
      } else if (key.name === 'backspace') {
        password = Array.from(password).slice(0, -1).join('');
      } else if (character && !key.ctrl && !key.meta) {
        password += character;
      }
    };
    input.on('keypress', onKeypress);
  });
}

async function provisionAdministrator(env = process.env) {
  resolveSupabaseConfig(env);
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.ADMIN_PASSWORD || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid administrator email address.');
  }
  if (password.length < 8) {
    throw new Error('Administrator password must contain at least 8 characters.');
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
  (async () => {
    const env = { ...process.env };
    if (!env.ADMIN_PASSWORD) env.ADMIN_PASSWORD = await promptForPassword();
    const { email } = await provisionAdministrator(env);
    process.stdout.write(`Administrator provisioned: ${email}\n`);
  })().catch((error) => {
    console.error(error.message || 'Administrator provisioning failed.');
    process.exitCode = 1;
  });
}

module.exports = { promptForPassword, provisionAdministrator };
