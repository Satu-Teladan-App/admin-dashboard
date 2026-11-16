"use client";
import { confirmedAdminRpc } from '@/src/lib/adminOperations';

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus, Shield, Settings } from "lucide-react";
import { toast } from "sonner";
import DefaultLayout from "@/src/layout/DefaultLayout";
import HeaderPage from "@/src/layout/Header";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (rolesError) throw rolesError;

      // Fetch permissions for each role separately
      const rolesWithPermissions = [];
      for (const role of rolesData || []) {
        // Get role permissions
        const { data: rolePermissions, error: rolePermissionsError } = await supabase
          .from("role_permissions")
          .select("permission_id")
          .eq("role_id", role.id);
        if (rolePermissionsError) throw rolePermissionsError;

        // Get permission details
        const permissionIds =
          rolePermissions?.map((rp) => rp.permission_id) || [];
        let permissions = [];

        if (permissionIds.length > 0) {
          const { data: permissionsData, error: permissionsError } = await supabase
            .from("permissions")
            .select("id, name, description")
            .in("id", permissionIds);
          if (permissionsError) throw permissionsError;
          if (!permissionsData || permissionsData.length !== new Set(permissionIds).size) {
            throw new Error("Role permissions could not be loaded completely");
          }

          permissions = permissionsData || [];
        }

        rolesWithPermissions.push({
          ...role,
          permissions: permissions,
        });
      }

      setRoles(rolesWithPermissions);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("name");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const createRole = async () => {
    if (!newRole.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      await confirmedAdminRpc(supabase, 'admin_save_role', {
        p_id: null, p_name: newRole.name, p_description: newRole.description, p_permissions: selectedPermissions,
      });

      toast.success("Role created successfully");
      setIsCreateDialogOpen(false);
      setNewRole({ name: "", description: "" });
      setSelectedPermissions([]);
      fetchRoles();
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error(error.message);
    }
  };

  const updateRole = async () => {
    if (!editingRole || !editingRole.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      await confirmedAdminRpc(supabase, 'admin_save_role', {
        p_id: editingRole.id, p_name: editingRole.name, p_description: editingRole.description, p_permissions: selectedPermissions,
      });

      toast.success("Role updated successfully");
      setIsEditDialogOpen(false);
      setEditingRole(null);
      setSelectedPermissions([]);
      fetchRoles();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error.message);
    }
  };

  const deleteRole = async (roleId) => {
    if (
      !confirm(
        "Are you sure you want to delete this role? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await confirmedAdminRpc(supabase, 'admin_delete_role', { p_id: roleId });

      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error(error.message);
    }
  };

  const openEditDialog = (role) => {
    setEditingRole({ ...role });
    setSelectedPermissions(role.permissions.map((p) => p.id));
    setIsEditDialogOpen(true);
  };

  const createPermission = async (name, description) => {
    if (!name.trim()) {
      toast.error("Permission name is required");
      return;
    }

    try {
      await confirmedAdminRpc(supabase, 'admin_save_permission', {
        p_id: null, p_name: name.trim(), p_description: description.trim(), p_delete: false,
      });

      toast.success("Permission created successfully");
      fetchPermissions();
    } catch (error) {
      console.error("Error creating permission:", error);
      toast.error(error.message);
      throw error;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend="Admin Roles" link="admin-roles" />
      </HeaderPage>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Roles & Permissions</h1>
            <p className="text-gray-600">Manage roles and their permissions</p>
          </div>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Card className="">
              <CardHeader className="">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="">Roles</CardTitle>
                    <CardDescription className="">
                      Manage admin roles and their permissions
                    </CardDescription>
                  </div>
                  <Dialog
                    open={isCreateDialogOpen}
                    onOpenChange={setIsCreateDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="" variant="" size="">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader className="">
                        <DialogTitle className="">Create New Role</DialogTitle>
                        <DialogDescription className="">
                          Create a new admin role and assign permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label className="" htmlFor="name">
                            Role Name
                          </Label>
                          <Input
                            id="name"
                            value={newRole.name}
                            onChange={(e) =>
                              setNewRole({ ...newRole, name: e.target.value })
                            }
                            placeholder="Enter role name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="" htmlFor="description">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={newRole.description}
                            onChange={(e) =>
                              setNewRole({
                                ...newRole,
                                description: e.target.value,
                              })
                            }
                            placeholder="Enter role description"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="">Permissions</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={selectedPermissions.includes(
                                    permission.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissions([
                                        ...selectedPermissions,
                                        permission.id,
                                      ]);
                                    } else {
                                      setSelectedPermissions(
                                        selectedPermissions.filter(
                                          (id) => id !== permission.id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label
                                    htmlFor={`permission-${permission.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {permission.name}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="">
                        <Button
                          className=""
                          variant="outline"
                          size=""
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className=""
                          variant=""
                          size=""
                          onClick={createRole}
                        >
                          Create Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="">
                {roles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No roles found</p>
                  </div>
                ) : (
                  <Table className="">
                    <TableHeader className="">
                      <TableRow className="">
                        <TableHead className="">Role Name</TableHead>
                        <TableHead className="">Description</TableHead>
                        <TableHead className="">Permissions</TableHead>
                        <TableHead className="">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="">
                      {roles.map((role) => (
                        <TableRow className="" key={role.id}>
                          <TableCell className="font-medium">
                            {role.name}
                          </TableCell>
                          <TableCell className="">{role.description}</TableCell>
                          <TableCell className="">
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.map((permission) => (
                                <Badge
                                  className=""
                                  key={permission.id}
                                  variant="outline"
                                >
                                  {permission.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="">
                            {formatDate(role.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(role)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteRole(role.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab
              permissions={permissions}
              onCreatePermission={createPermission}
              onRefresh={fetchPermissions}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="">
              <DialogTitle className="">Edit Role</DialogTitle>
              <DialogDescription className="">
                Update role information and permissions.
              </DialogDescription>
            </DialogHeader>
            {editingRole && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="" htmlFor="edit-name">
                    Role Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingRole.name}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, name: e.target.value })
                    }
                    placeholder="Enter role name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="" htmlFor="edit-description">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={editingRole.description}
                    onChange={(e) =>
                      setEditingRole({
                        ...editingRole,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter role description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="">Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`edit-permission-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPermissions([
                                ...selectedPermissions,
                                permission.id,
                              ]);
                            } else {
                              setSelectedPermissions(
                                selectedPermissions.filter(
                                  (id) => id !== permission.id
                                )
                              );
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`edit-permission-${permission.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="">
              <Button
                className=""
                variant="outline"
                size=""
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="" variant="" size="" onClick={updateRole}>
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DefaultLayout>
  );
}

// Permissions Tab Component
function PermissionsTab({ permissions, onCreatePermission, onRefresh }) {
  const [isCreatePermissionDialogOpen, setIsCreatePermissionDialogOpen] =
    useState(false);
  const [newPermission, setNewPermission] = useState({
    name: "",
    description: "",
  });
  const supabase = createClient();

  const handleCreatePermission = async () => {
    try { await onCreatePermission(newPermission.name, newPermission.description); }
    catch { return; }
    setNewPermission({ name: "", description: "" });
    setIsCreatePermissionDialogOpen(false);
    onRefresh();
  };

  const deletePermission = async (permissionId) => {
    if (
      !confirm(
        "Are you sure you want to delete this permission? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await confirmedAdminRpc(supabase, 'admin_save_permission', { p_id: permissionId, p_name: null, p_description: null, p_delete: true });

      toast.success("Permission deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast.error(error.message);
    }
  };

  return (
    <DefaultLayout>
      <Card className="">
        <CardHeader className="">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="">Permissions</CardTitle>
              <CardDescription className="">
                Manage available permissions for roles
              </CardDescription>
            </div>
            <Dialog
              open={isCreatePermissionDialogOpen}
              onOpenChange={setIsCreatePermissionDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="" variant="" size="">
                  <Shield className="w-4 h-4 mr-2" />
                  Create Permission
                </Button>
              </DialogTrigger>
              <DialogContent className="">
                <DialogHeader className="">
                  <DialogTitle className="">Create New Permission</DialogTitle>
                  <DialogDescription className="">
                    Create a new permission that can be assigned to roles.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label className="" htmlFor="permission-name">
                      Permission Name
                    </Label>
                    <Input
                      id="permission-name"
                      value={newPermission.name}
                      onChange={(e) =>
                        setNewPermission({
                          ...newPermission,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., manage_users"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="" htmlFor="permission-description">
                      Description
                    </Label>
                    <Textarea
                      id="permission-description"
                      value={newPermission.description}
                      onChange={(e) =>
                        setNewPermission({
                          ...newPermission,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe what this permission allows"
                    />
                  </div>
                </div>
                <DialogFooter className="">
                  <Button
                    className=""
                    variant="outline"
                    size=""
                    onClick={() => setIsCreatePermissionDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className=""
                    variant=""
                    size=""
                    onClick={handleCreatePermission}
                  >
                    Create Permission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="">
          {permissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No permissions found</p>
            </div>
          ) : (
            <Table className="">
              <TableHeader className="">
                <TableRow className="">
                  <TableHead className="">Permission Name</TableHead>
                  <TableHead className="">Description</TableHead>
                  <TableHead className="">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {permissions.map((permission) => (
                  <TableRow className="" key={permission.id}>
                    <TableCell className="font-medium">
                      {permission.name}
                    </TableCell>
                    <TableCell className="">{permission.description}</TableCell>
                    <TableCell className="">
                      {new Date().toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePermission(permission.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DefaultLayout>
  );
}
