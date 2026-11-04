function getChangelogRetentionCutoff(retentionDays, now = new Date()) {
  if (!Number.isInteger(retentionDays) || retentionDays < 0 || retentionDays > 36500) {
    throw new RangeError('Changelog retention must be an integer between 0 and 36500 days.');
  }
  if (retentionDays === 0) return null;

  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff.toISOString().slice(0, 10);
}

module.exports = {
  getChangelogRetentionCutoff,
};
