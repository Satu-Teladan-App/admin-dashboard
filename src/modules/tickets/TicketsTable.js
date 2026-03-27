"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Eye,
  MoreVertical,
  RefreshCw,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Trash2,
  ChevronDown,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function TicketsTable() {
  const [ticketsData, setTicketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [replies, setReplies] = useState([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTicketsData(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId) => {
    try {
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast.error("Failed to fetch replies");
    }
  };

  const handleOpenDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setAdminNote(ticket.admin_notes || "");
    setReplyMessage("");
    await fetchReplies(ticket.id);
    setShowDetailDialog(true);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user?.user?.id,
        message: replyMessage.trim(),
        is_admin_reply: true,
      });

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplyMessage("");
      await fetchReplies(selectedTicket.id);

      // Auto-set status to "in_progress" if it was "open"
      if (selectedTicket.status === "open") {
        await handleUpdateStatus(selectedTicket.id, "in_progress", false);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus, showToast = true) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      if (showToast) toast.success(`Ticket marked as ${newStatus}`);

      // Update local state
      setTicketsData((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updateData } : t)),
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => ({ ...prev, ...updateData }));
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      if (showToast) toast.error("Failed to update ticket status");
    }
  };

  const handleUpdatePriority = async (ticketId, newPriority) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success(`Priority updated to ${newPriority}`);
      setTicketsData((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, priority: newPriority } : t,
        ),
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => ({ ...prev, priority: newPriority }));
      }
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleSaveAdminNote = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_notes: adminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast.success("Admin note saved");
      setTicketsData((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id ? { ...t, admin_notes: adminNote } : t,
        ),
      );
      setSelectedTicket((prev) => ({ ...prev, admin_notes: adminNote }));
    } catch (error) {
      console.error("Error saving admin note:", error);
      toast.error("Failed to save admin note");
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (
      !confirm(
        "Are you sure you want to delete this ticket? This action cannot be undone.",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("Ticket deleted successfully");
      setTicketsData((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setShowDetailDialog(false);
        setSelectedTicket(null);
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Open
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <RefreshCw className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <XCircle className="w-3 h-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Low
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            {priority}
          </Badge>
        );
    }
  };

  const getStats = () => {
    const total = ticketsData.length;
    const open = ticketsData.filter((t) => t.status === "open").length;
    const inProgress = ticketsData.filter(
      (t) => t.status === "in_progress",
    ).length;
    const resolved = ticketsData.filter((t) => t.status === "resolved").length;
    const urgent = ticketsData.filter((t) => t.priority === "urgent").length;

    return { total, open, inProgress, resolved, urgent };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = ticketsData.filter((ticket) => {
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;

    const matchesPriority =
      filterPriority === "all" || ticket.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading tickets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 mr-auto w-11/12">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sky-50 border-sky-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              </div>
              <Clock className="w-8 h-8 text-sky-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.resolved}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.urgent}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Support Tickets</CardTitle>
            <Button onClick={fetchTickets} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ||
                filterStatus !== "all" ||
                filterPriority !== "all"
                  ? "No tickets found matching your criteria"
                  : "No support tickets available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Subject</TableHead>
                  <TableHead className="text-center text-lg">
                    Priority
                  </TableHead>
                  <TableHead className="text-center text-lg">Status</TableHead>
                  <TableHead className="text-center text-lg">
                    Submitted
                  </TableHead>
                  <TableHead className="text-center text-lg">Updated</TableHead>
                  <TableHead className="text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={
                      ticket.priority === "urgent" && ticket.status === "open"
                        ? "bg-red-50"
                        : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{ticket.subject}</div>
                          <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                            {ticket.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">
                            {ticket.user_id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getPriorityBadge(ticket.priority)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">
                      {formatDate(ticket.updated_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(ticket)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenDetail(ticket)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              View & Reply
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {ticket.status !== "in_progress" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateStatus(ticket.id, "in_progress")
                                }
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Mark In Progress
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "resolved" && (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  handleUpdateStatus(ticket.id, "resolved")
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "closed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateStatus(ticket.id, "closed")
                                }
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Close Ticket
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "open" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateStatus(ticket.id, "open")
                                }
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Reopen Ticket
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteTicket(ticket.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Ticket
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
        </CardContent>
      </Card>

      {/* Ticket Detail & Reply Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Ticket Detail
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
              {/* Ticket Header */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-base">
                    {selectedTicket.subject}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  {selectedTicket.message}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                  <span>
                    User:{" "}
                    <span className="font-mono">{selectedTicket.user_id}</span>
                  </span>
                  <span>
                    Submitted: {formatDate(selectedTicket.created_at)}
                  </span>
                  {selectedTicket.resolved_at && (
                    <span>
                      Resolved: {formatDate(selectedTicket.resolved_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-600 shrink-0">
                  Change Status:
                </Label>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(val) =>
                    handleUpdateStatus(selectedTicket.id, val)
                  }
                >
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Label className="text-sm font-medium text-gray-600 shrink-0 ml-2">
                  Priority:
                </Label>
                <Select
                  value={selectedTicket.priority}
                  onValueChange={(val) =>
                    handleUpdatePriority(selectedTicket.id, val)
                  }
                >
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Replies Thread */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">
                  Conversation ({replies.length})
                </Label>
                <div className="mt-2 space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3 bg-white">
                  {replies.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No replies yet. Be the first to respond.
                    </p>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`flex gap-3 ${reply.is_admin_reply ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            reply.is_admin_reply
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {reply.is_admin_reply ? "A" : "U"}
                        </div>
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            reply.is_admin_reply
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p>{reply.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              reply.is_admin_reply
                                ? "text-blue-200"
                                : "text-gray-400"
                            }`}
                          >
                            {formatDate(reply.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== "closed" && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Reply as Admin
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      className="flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) handleSendReply();
                      }}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || sendingReply}
                      className="bg-blue-600 hover:bg-blue-700 self-end"
                    >
                      {sendingReply ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Press Ctrl+Enter to send
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label className="text-sm font-semibold text-gray-700">
                  Admin Notes (internal only)
                </Label>
                <div className="mt-2 flex gap-2">
                  <Textarea
                    placeholder="Add internal notes about this ticket..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none bg-yellow-50 border-yellow-200"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveAdminNote}
                    className="self-end"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
