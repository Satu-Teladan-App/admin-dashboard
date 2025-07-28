import { createClient } from "@/utils/supabase/client";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Check if the current user has a specific permission
 * @param {string} permissionName - The name of the permission to check
 * @param {boolean} isServerSide - Whether this is being called from server side
 * @returns {Promise<boolean>} - Whether the user has the permission
 */
export async function hasPermission(permissionName, isServerSide = false) {
  try {
    let supabase;

    if (isServerSide) {
      const cookieStore = cookies();
      supabase = createServerClient(cookieStore);
    } else {
      supabase = createClient();
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    // Use the database function to check permission
    const { data, error } = await supabase.rpc("has_permission", {
      permission_name: permissionName,
    });

    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error("Error in hasPermission:", error);
    return false;
  }
}

/**
 * Get all permissions for the current user
 * @param {boolean} isServerSide - Whether this is being called from server side
 * @returns {Promise<string[]>} - Array of permission names
 */
export async function getUserPermissions(isServerSide = false) {
  try {
    let supabase;

    if (isServerSide) {
      const cookieStore = cookies();
      supabase = createServerClient(cookieStore);
    } else {
      supabase = createClient();
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    // Get user's admin roles and their permissions
    const { data: adminRoles, error: adminError } = await supabase
      .from("admin_roles")
      .select(
        `
        role_id,
        roles (
          id,
          role_permissions (
            permissions (
              name
            )
          )
        )
      `
      )
      .eq("user_id", user.id);

    if (adminError) {
      console.error("Error fetching user permissions:", adminError);
      return [];
    }

    // Extract permission names
    const permissions = [];
    adminRoles?.forEach((adminRole) => {
      adminRole.roles?.role_permissions?.forEach((rolePermission) => {
        if (rolePermission.permissions?.name) {
          permissions.push(rolePermission.permissions.name);
        }
      });
    });

    // Remove duplicates
    return [...new Set(permissions)];
  } catch (error) {
    console.error("Error in getUserPermissions:", error);
    return [];
  }
}

/**
 * Get user's admin role information
 * @param {boolean} isServerSide - Whether this is being called from server side
 * @returns {Promise<{roles: Array, isAdmin: boolean}>} - User's roles and admin status
 */
export async function getUserRoles(isServerSide = false) {
  try {
    let supabase;

    if (isServerSide) {
      const cookieStore = cookies();
      supabase = createServerClient(cookieStore);
    } else {
      supabase = createClient();
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { roles: [], isAdmin: false };
    }

    // Get user's admin roles
    const { data: adminRoles, error: adminError } = await supabase
      .from("admin_roles")
      .select(
        `
        role_id,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq("user_id", user.id);

    if (adminError) {
      console.error("Error fetching user roles:", adminError);
      return { roles: [], isAdmin: false };
    }

    const roles =
      adminRoles?.map((adminRole) => adminRole.roles).filter(Boolean) || [];

    return {
      roles: roles,
      isAdmin: roles.length > 0,
    };
  } catch (error) {
    console.error("Error in getUserRoles:", error);
    return { roles: [], isAdmin: false };
  }
}

/**
 * Common permission names - can be extended as needed
 */
export const PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles",
  MANAGE_BERITA: "manage_berita",
  MANAGE_KOMUNITAS: "manage_komunitas",
  MANAGE_KEGIATAN: "manage_kegiatan",
  MANAGE_DONASI: "manage_donasi",
  VIEW_ANALYTICS: "view_analytics",
  MODERATE_CONTENT: "moderate_content",
};
