const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');
const path = require('node:path');
const { resolveSupabaseConfig } = require('./supabase-sync');

const clients = new Map();

function loadLocalEnvironment() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

loadLocalEnvironment();

function getSupabaseClient(env = process.env) {
  const config = resolveSupabaseConfig(env);
  const cacheKey = `${config.url}\n${config.serviceRoleKey}`;
  let client = clients.get(cacheKey);

  if (!client) {
    client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (...args) => globalThis.fetch(...args),
      },
    });
    clients.set(cacheKey, client);
  }

  return client;
}

const supabase = {
  from(tableName) {
    return getSupabaseClient().from(tableName);
  },
  rpc(functionName, parameters) {
    return getSupabaseClient().rpc(functionName, parameters);
  },
};

module.exports = {
  getSupabaseClient,
  loadLocalEnvironment,
  supabase,
};
