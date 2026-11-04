function buildEmployeePermissionRecord({
  employeeId,
  canAccessAdmin,
  permissionGrantedBy = null,
  permissionGrantedAt = null,
  updatedAt = null,
} = {}) {
  return {
    employee_id: employeeId || null,
    can_access_admin: Boolean(canAccessAdmin),
    permission_granted_by: permissionGrantedBy || null,
    permission_granted_at: permissionGrantedAt || null,
    updated_at: updatedAt || new Date().toISOString(),
  };
}

function resolvePermissionState(permissionRecord = {}) {
  const canAccess = Boolean(permissionRecord.can_access_admin ?? permissionRecord.canAccessAdmin ?? false);
  if (canAccess) {
    return {
      accessAllowed: true,
      permissionLabel: 'Granted',
      statusClass: 'online',
    };
  }

  return {
    accessAllowed: false,
    permissionLabel: permissionRecord.permission_granted_at ? 'Revoked' : 'Not granted',
    statusClass: 'offline',
  };
}

module.exports = {
  buildEmployeePermissionRecord,
  resolvePermissionState,
};
