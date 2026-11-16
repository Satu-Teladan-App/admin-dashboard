export const adminPagePermissions = {
  '/': 'view_analytics', '/overview': 'view_analytics', '/alumni': 'manage_users',
  '/berita': 'manage_berita', '/kegiatan': 'manage_kegiatan', '/tantangan': 'manage_kegiatan',
  '/komunitas': 'manage_komunitas', '/pendanaan': 'manage_donasi', '/kontribusi': 'view_analytics',
  '/messages': 'moderate_content', '/pesan': 'moderate_content', '/blacklists': 'moderate_content',
  '/tickets': 'manage_support', '/manage-admin': 'manage_roles', '/admin-roles': 'manage_roles',
  '/account-requests': 'manage_users',
};
export const permissionForPage = path => adminPagePermissions['/' + (path.split('/')[1] || '')] || 'unavailable_page';
export async function getMenuPermissions(client) {
  const permissions = [...new Set(Object.values(adminPagePermissions).filter(permission => permission !== 'manage_donasi'))];
  const results = await Promise.all(permissions.map(async permission => {
    const { data, error } = await client.rpc('app_admin_allowed', { p_permission: permission });
    if (error) throw error;
    return data === true ? permission : null;
  }));
  return new Set(results.filter(Boolean));
}
