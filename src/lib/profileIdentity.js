/** @typedef {{batch?: string | null, batch_status?: string | null, graduation_year?: number | string | null, graduationYear?: number | string | null}} ProfileIdentity */

export const normalizeProfileRole = (value) => {
  const role = String(value ?? '').trim().toLowerCase();
  if (['aktif', 'siswa aktif', 'siswa_aktif', 'active', 'aktif siswa'].includes(role)) return 'aktif';
  if (['alumni', 'alumnus'].includes(role)) return 'alumni';
  if (['guru', 'teacher'].includes(role)) return 'guru';
  return '';
};

export const parseLegacyBatch = (value) => {
  const match = String(value ?? '').trim().match(/^(alumni|alumnus|aktif|siswa aktif|siswa_aktif|active|aktif siswa|guru|teacher)(?:\s*-\s*(\d{4}))?$/i);
  return { role: match ? normalizeProfileRole(match[1]) : '', year: match?.[2] ? Number(match[2]) : null };
};

/** @param {ProfileIdentity | null | undefined} profile */
export const getAlumniRole = (profile) => {
  if (String(profile?.batch_status ?? '').trim()) return normalizeProfileRole(profile.batch_status);
  return parseLegacyBatch(profile?.batch).role;
};

/** @param {ProfileIdentity | null | undefined} profile */
export const getGraduationYear = (profile) => {
  const explicit = profile?.graduation_year ?? profile?.graduationYear;
  if (explicit != null && String(explicit).trim() !== '') {
    return /^\d{4}$/.test(String(explicit)) && Number(explicit) >= 1900 ? Number(explicit) : null;
  }
  const legacy = parseLegacyBatch(profile?.batch);
  return legacy.role && legacy.role === getAlumniRole(profile) && legacy.year >= 1900 ? legacy.year : null;
};

/** @param {ProfileIdentity | null | undefined} profile */
export const getProfileRoleLabel = (profile) =>
  ({ alumni: 'Alumni', aktif: 'Siswa aktif', guru: 'Guru' }[getAlumniRole(profile)] || 'Status belum diisi');

/** @param {ProfileIdentity | null | undefined} profile */
export const formatProfileIdentity = (profile) => {
  const role = getAlumniRole(profile);
  const year = getGraduationYear(profile);
  if (role === 'guru') return 'Guru';
  if (role === 'aktif') return year ? `Siswa aktif · Perkiraan lulus ${year}` : 'Siswa aktif';
  if (role === 'alumni') return year ? `Alumni · Lulus ${year}` : 'Alumni';
  return 'Status belum diisi';
};

/** @param {ProfileIdentity & {name?: string | null}} profile */
export const hasProfileIdentity = (profile) => Boolean(
  profile?.name?.trim() && getAlumniRole(profile) &&
  (getAlumniRole(profile) === 'guru' || getGraduationYear(profile)),
);

// Retain this derived field until installed clients no longer read batch.
/** @param {ProfileIdentity | null | undefined} profile */
export const formatLegacyBatch = (profile) => {
  const role = getAlumniRole(profile);
  if (!role) return null;
  const label = { alumni: 'Alumni', aktif: 'Aktif', guru: 'Guru' }[role];
  const year = getGraduationYear(profile);
  return year ? `${label} - ${year}` : label;
};

export const validateProfileYear = (role, value, currentYear = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date()))) => {
  const year = String(value ?? '').trim();
  if (!year && role !== 'guru') return 'Tahun lulus harus diisi';
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > currentYear + 12)) return 'Masukkan tahun lulus empat digit yang valid';
  if (year && role === 'alumni' && Number(year) > currentYear) return 'Tahun lulus alumni tidak boleh di masa depan';
  if (year && role === 'aktif' && Number(year) < currentYear) return 'Perkiraan tahun lulus tidak boleh sebelum tahun ini';
  return null;
};

/** @param {ProfileIdentity} profile */
export const profileIdentityFields = (profile) => {
  const role = getAlumniRole(profile);
  if (!role) throw new Error('Pilih status Alumni, Siswa aktif, atau Guru');
  const rawYear = Object.prototype.hasOwnProperty.call(profile, 'graduation_year')
    ? profile.graduation_year
    : Object.prototype.hasOwnProperty.call(profile, 'graduationYear') ? profile.graduationYear : getGraduationYear(profile);
  const error = validateProfileYear(role, rawYear);
  if (error) throw new Error(error);
  const identity = { batch_status: role, graduation_year: rawYear == null || String(rawYear).trim() === '' ? null : Number(rawYear) };
  return identity;
};

export const profileSearchFilter = (value) => {
  const term = String(value ?? '').normalize('NFKC').trim().slice(0, 100);
  if (!term) return null;
  const literal = JSON.stringify(`%${term.replace(/[\\%_]/g, '\\$&')}%`);
  const filters = [`name.ilike.${literal}`, `full_name.ilike.${literal}`];
  const role = normalizeProfileRole(term);
  if (role) filters.push(`batch_status.eq.${role}`);
  if (/^\d{4}$/.test(term)) filters.push(`graduation_year.eq.${Number(term)}`);
  return filters.join(',');
};
