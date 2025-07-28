"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import DefaultLayout from "@/src/layout/DefaultLayout";

export default function ManageAdminPage() {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [alumniSearchQuery, setAlumniSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchAdmins();
    fetchRoles();
    fetchAlumni();
  }, []);

  const fetchAdmins = async () => {
    try {
      // First get admin roles
      const { data: adminRoles, error: adminError } = await supabase
        .from("admin_roles")
        .select("user_id, role_id, created_at");

      if (adminError) throw adminError;

      // Get roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, description");

      if (rolesError) throw rolesError;

      // Get users separately
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, user_id");

      if (usersError) throw usersError;

      // Get alumni separately
      const { data: alumniData, error: alumniError } = await supabase
        .from("alumni")
        .select("id, name, user_id");

      if (alumniError) throw alumniError;

      // Combine the data
      const adminData = [];
      for (const adminRole of adminRoles || []) {
        const role = rolesData?.find((r) => r.id === adminRole.role_id);
        const user = usersData?.find((u) => u.user_id === adminRole.user_id);
        const alumnus = alumniData?.find(
          (a) => a.user_id === adminRole.user_id
        );

        adminData.push({
          user_id: adminRole.user_id,
          role_id: adminRole.role_id,
          role_name: role?.name || "Unknown Role",
          role_description: role?.description || "",
          user_email: user?.email || "Unknown Email",
          alumni_name: alumnus?.name || "Unknown Alumni",
          created_at: adminRole.created_at,
        });
      }

      setAdmins(adminData);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admins");
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from("alumni")
        .select("id, name, user_id")
        .order("name");

      if (error) throw error;
      setAlumni(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching alumni:", error);
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!selectedAlumni || !selectedRole) {
      toast.error("Please select both alumni and role");
      return;
    }

    try {
      // Check if user is already an admin
      const { data: existing } = await supabase
        .from("admin_roles")
        .select("*")
        .eq("user_id", selectedAlumni);

      if (existing && existing.length > 0) {
        toast.error("This user is already an admin");
        return;
      }

      const { error } = await supabase.from("admin_roles").insert({
        user_id: selectedAlumni,
        role_id: parseInt(selectedRole),
      });

      if (error) throw error;

      toast.success("Admin added successfully");
      setIsAddDialogOpen(false);
      setSelectedAlumni("");
      setSelectedRole("");
      fetchAdmins();
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add admin");
    }
  };

  const removeAdmin = async (userId) => {
    try {
      const { error } = await supabase
        .from("admin_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Admin removed successfully");
      fetchAdmins();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Failed to remove admin");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Filter admins based on search query
  const filteredAdmins = admins.filter(
    (admin) =>
      admin.alumni_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter available alumni for selection (not already admins + search filter)
  const availableAlumni = alumni
    .filter((a) => !admins.some((admin) => admin.user_id === a.user_id))
    .filter((a) =>
      a.name.toLowerCase().includes(alumniSearchQuery.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DefaultLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Admins</h1>
            <p className="text-gray-600">
              Manage admin users and their role assignments
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="" variant="" size="">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="">
              <DialogHeader className="">
                <DialogTitle className="">Add New Admin</DialogTitle>
                <DialogDescription className="">
                  Select an alumni and assign them an admin role.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="" htmlFor="alumni">
                    Alumni
                  </Label>
                  <Input
                    placeholder="Search alumni..."
                    value={alumniSearchQuery}
                    onChange={(e) => setAlumniSearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <Select
                    value={selectedAlumni}
                    onValueChange={setSelectedAlumni}
                  >
                    <SelectTrigger className="" size="">
                      <SelectValue placeholder="Select alumni" />
                    </SelectTrigger>
                    <SelectContent className="" position="">
                      {availableAlumni.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          {alumniSearchQuery
                            ? "No alumni found matching search"
                            : "No available alumni"}
                        </div>
                      ) : (
                        availableAlumni.map((alumnus) => (
                          <SelectItem
                            className=""
                            key={alumnus.id}
                            value={alumnus.user_id}
                          >
                            {alumnus.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="" htmlFor="role">
                    Role
                  </Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="" size="">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="" position="">
                      {roles.map((role) => (
                        <SelectItem
                          className=""
                          key={role.id}
                          value={role.id.toString()}
                        >
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="">
                <Button
                  className=""
                  variant="outline"
                  size=""
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button className="" variant="" size="" onClick={addAdmin}>
                  Add Admin
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="">
          <CardHeader className="">
            <CardTitle className="">Current Admins</CardTitle>
            <CardDescription className="">
              List of all admin users and their assigned roles
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="mb-4">
              <Label className="sr-only" htmlFor="search">
                Search
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Search by name, email, or role"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No admins found</p>
              </div>
            ) : (
              <Table className="">
                <TableHeader className="">
                  <TableRow className="">
                    <TableHead className="">Name</TableHead>
                    <TableHead className="">Email</TableHead>
                    <TableHead className="">Role</TableHead>
                    <TableHead className="">Added Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="">
                  {filteredAdmins.map((admin) => (
                    <TableRow
                      className=""
                      key={`${admin.user_id}-${admin.role_id}`}
                    >
                      <TableCell className="font-medium">
                        {admin.alumni_name}
                      </TableCell>
                      <TableCell className="">{admin.user_email}</TableCell>
                      <TableCell className="">
                        <div className="flex flex-col gap-1">
                          <Badge className="" variant="secondary">
                            {admin.role_name}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {admin.role_description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="">
                        {formatDate(admin.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAdmin(admin.user_id)}
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
      </div>
    </DefaultLayout>
  );
}
