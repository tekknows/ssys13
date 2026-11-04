const { createClient } = require('@supabase/supabase-js');
const { resolveSupabaseConfig } = require('./supabase-sync');

const clients = new Map();

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
  supabase,
};
