"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Reply,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  AlertCircle,
  Ban,
  Shield,
  Users,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function PesanTable() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const supabase = createClient();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);

      // First, fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Fetch reports for messages separately
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .not("messages_id", "is", null);

      if (reportsError) {
        console.warn("Error fetching reports:", reportsError);
      }

      // Get unique user IDs from sender and receiver fields
      const userIds = new Set();
      messagesData?.forEach((message) => {
        if (message.sender_alumni_id) userIds.add(message.sender_alumni_id);
        if (message.receiver_alumni_id) userIds.add(message.receiver_alumni_id);
      });

      // Fetch alumni information for all involved users
      let alumniData = [];
      if (userIds.size > 0) {
        const { data: alumniDataResult, error: alumniError } = await supabase
          .from("alumni")
          .select(
            "id, user_id, name, full_name, telephone, avatar, batch, graduation_year"
          )
          .in("id", Array.from(userIds));

        if (alumniError) {
          console.warn("Error fetching alumni:", alumniError);
          // Continue without alumni data if alumni table fetch fails
        } else {
          alumniData = alumniDataResult || [];
        }
      }

      // Create a map of alumni ID to alumni info for quick lookup
      const alumniMap = new Map();
      alumniData.forEach((alumni) => {
        alumniMap.set(alumni.id, alumni);
      });

      // Create a map of message ID to reports
      const reportsMap = new Map();
      (reportsData || []).forEach((report) => {
        if (!reportsMap.has(report.messages_id)) {
          reportsMap.set(report.messages_id, []);
        }
        reportsMap.get(report.messages_id).push(report);
      });

      // Enrich messages with alumni information
      const enrichedMessages = (messagesData || []).map((message) => {
        const reports = reportsMap.get(message.id) || [];
        return {
          ...message,
          senderInfo: alumniMap.get(message.sender_alumni_id) || {
            id: message.sender_alumni_id,
            name: "Unknown User",
            full_name: "Unknown User",
          },
          receiverInfo: alumniMap.get(message.receiver_alumni_id) || {
            id: message.receiver_alumni_id,
            name: "Unknown User",
            full_name: "Unknown User",
          },
          reports: reports,
          hasReports: reports.length > 0,
        };
      });

      setMessages(enrichedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (
      !confirm(
        "Are you sure you want to delete this message? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast.success("Message deleted successfully");
      fetchMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleBlacklistUser = async () => {
    if (!userToBlacklist || !blacklistReason.trim()) {
      toast.error("Please provide a reason for blacklisting");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_feature_blacklist").insert({
        user_id: userToBlacklist.user_id,
        feature: "message",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from messaging features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchMessages();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleViewReports = (message) => {
    if (message.reports.length === 0) {
      toast.info("No reports found for this message");
      return;
    }

    // You could implement a detailed reports dialog here
    const reportCount = message.reports.length;
    const reportReasons = message.reports.map((r) => r.alasan).join(", ");
    alert(`This message has ${reportCount} report(s):\n${reportReasons}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateMessage = (message, maxLength = 100) => {
    if (!message) return "No message content";
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  };

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.senderInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      message.senderInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      message.receiverInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      message.receiverInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      message.message?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "reported" && message.hasReports) ||
      (filterStatus === "recent" &&
        new Date(message.created_at) >
          new Date(Date.now() - 24 * 60 * 60 * 1000));

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading messages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Message Management</CardTitle>
          <Button onClick={fetchMessages} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter messages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="reported">Reported Messages</SelectItem>
                <SelectItem value="recent">Recent (24h)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm
                ? "No messages found matching your search"
                : "No messages found"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="  ">
                <TableHead className="w-150 text-center text-lg">
                  Sender
                </TableHead>
                <TableHead className="w-150 text-center text-lg">
                  Receiver
                </TableHead>
                <TableHead className="w-150 text-center text-lg">
                  Message
                </TableHead>
                <TableHead className="w-150 text-center text-lg">
                  Date
                </TableHead>
                <TableHead className="w-150 text-center text-lg">
                  Status
                </TableHead>
                <TableHead className="w-150 text-center text-lg">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.map((message) => (
                <TableRow
                  key={message.id}
                  className={
                    message.hasReports ? "bg-red-50 border-red-100" : ""
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {message.senderInfo?.full_name ||
                            message.senderInfo?.name ||
                            "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {message.senderInfo?.batch &&
                            `Batch ${message.senderInfo.batch}`}
                          {message.senderInfo?.graduation_year &&
                            ` • ${message.senderInfo.graduation_year}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {message.senderInfo?.user_id || "No ID"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {message.receiverInfo?.full_name ||
                            message.receiverInfo?.name ||
                            "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {message.receiverInfo?.batch &&
                            `Batch ${message.receiverInfo.batch}`}
                          {message.receiverInfo?.graduation_year &&
                            ` • ${message.receiverInfo.graduation_year}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {message.receiverInfo?.user_id || "No ID"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p
                        className="text-sm text-gray-900 truncate"
                        title={message.message}
                      >
                        {truncateMessage(message.message)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 text-center">
                    {formatDate(message.created_at)}
                  </TableCell>
                  <TableCell className="text-sm  text-center">
                    {message.hasReports ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Reported ({message.reports.length})
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <Mail className="w-3 h-3 mr-1" />
                        Normal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMessage(message)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Message Details</DialogTitle>
                          </DialogHeader>
                          {selectedMessage && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Sender
                                  </Label>
                                  <p className="text-sm text-gray-900">
                                    {selectedMessage.senderInfo?.full_name ||
                                      selectedMessage.senderInfo?.name ||
                                      "Unknown User"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {selectedMessage.senderInfo?.batch &&
                                      `Batch ${selectedMessage.senderInfo.batch}`}
                                    {selectedMessage.senderInfo
                                      ?.graduation_year &&
                                      ` • ${selectedMessage.senderInfo.graduation_year}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID:{" "}
                                    {selectedMessage.senderInfo?.user_id ||
                                      "No ID"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Receiver
                                  </Label>
                                  <p className="text-sm text-gray-900">
                                    {selectedMessage.receiverInfo?.full_name ||
                                      selectedMessage.receiverInfo?.name ||
                                      "Unknown User"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {selectedMessage.receiverInfo?.batch &&
                                      `Batch ${selectedMessage.receiverInfo.batch}`}
                                    {selectedMessage.receiverInfo
                                      ?.graduation_year &&
                                      ` • ${selectedMessage.receiverInfo.graduation_year}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID:{" "}
                                    {selectedMessage.receiverInfo?.user_id ||
                                      "No ID"}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  Message Content
                                </Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-900">
                                    {selectedMessage.message ||
                                      "No message content"}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Sent At
                                  </Label>
                                  <p className="text-sm text-gray-900">
                                    {formatDate(selectedMessage.created_at)}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Reports
                                  </Label>
                                  <p className="text-sm text-gray-900">
                                    {selectedMessage.reports.length} report(s)
                                  </p>
                                </div>
                              </div>
                              {selectedMessage.reports.length > 0 && (
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Report Details
                                  </Label>
                                  <div className="mt-1 space-y-2">
                                    {selectedMessage.reports.map(
                                      (report, index) => (
                                        <div
                                          key={report.id}
                                          className="p-2 bg-red-50 rounded text-sm"
                                        >
                                          <p className="text-red-800">
                                            {report.alasan}
                                          </p>
                                          <p className="text-red-600 text-xs">
                                            Reported on{" "}
                                            {formatDate(report.created_at)}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {message.hasReports && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleViewReports(message)}
                              >
                                <AlertCircle className="w-4 h-4 mr-2" />
                                View Reports ({message.reports.length})
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setUserToBlacklist(message.senderInfo);
                              setShowBlacklistDialog(true);
                            }}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Blacklist Sender
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Blacklist User Dialog */}
        <Dialog
          open={showBlacklistDialog}
          onOpenChange={setShowBlacklistDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Blacklist User from Messaging</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  User to Blacklist
                </Label>
                <p className="text-sm text-gray-900">
                  {userToBlacklist?.full_name ||
                    userToBlacklist?.name ||
                    "Unknown User"}
                </p>
                <p className="text-xs text-gray-500">
                  {userToBlacklist?.batch && `Batch ${userToBlacklist.batch}`}
                  {userToBlacklist?.graduation_year &&
                    ` • ${userToBlacklist.graduation_year}`}
                </p>
                <p className="text-xs text-gray-500">
                  ID: {userToBlacklist?.user_id || "No ID"}
                </p>
              </div>
              <div>
                <Label
                  htmlFor="blacklist-reason"
                  className="text-sm font-medium text-gray-700"
                >
                  Reason for Blacklisting *
                </Label>
                <Textarea
                  id="blacklist-reason"
                  placeholder="Enter the reason for blacklisting this user from messaging..."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBlacklistDialog(false);
                    setBlacklistReason("");
                    setUserToBlacklist(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBlacklistUser}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!blacklistReason.trim()}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Blacklist User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
