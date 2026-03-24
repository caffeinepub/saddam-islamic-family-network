import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Crown,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AdminUserView, UserAdminRole, UserStatus } from "../backend";
import { useActor } from "../hooks/useActor";

const SUPER_ADMIN_EMAIL = "mdsaddamislamic@gmail.com";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusLabel(status: UserStatus): string {
  if ("pending" in status) return "Pending";
  if ("approved" in status) return "Approved";
  if ("rejected" in status) return "Rejected";
  if ("blocked" in status) return "Blocked";
  return "Unknown";
}

function statusColor(status: UserStatus): string {
  if ("pending" in status)
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if ("approved" in status)
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if ("rejected" in status)
    return "bg-red-500/20 text-red-400 border-red-500/30";
  if ("blocked" in status)
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return "";
}

function adminRoleLabel(role: UserAdminRole): string | null {
  if ("superAdmin" in role) return "Super Admin";
  if ("helperAdmin" in role) return "Helper Admin";
  return null;
}

function formatDate(ts: bigint): string {
  if (ts === BigInt(0)) return "—";
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Parse bio string "Relation: Father | Age: 25" into separate fields */
function parseBio(bio: string): { relation: string; age: string } {
  const relMatch = bio.match(/Relation:\s*([^|]+)/);
  const ageMatch = bio.match(/Age:\s*(\d+)/);
  return {
    relation: relMatch ? relMatch[1].trim() : "",
    age: ageMatch ? ageMatch[1].trim() : "",
  };
}

interface SuperAdminDashboardProps {
  onBack?: () => void;
}

export default function SuperAdminDashboard({
  onBack,
}: SuperAdminDashboardProps) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const {
    data: users,
    isLoading,
    refetch,
  } = useQuery<AdminUserView[]>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsersAdminView();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      user,
      status,
    }: { user: Principal; status: UserStatus }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateUserStatus(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  const setHelper = useMutation({
    mutationFn: async ({
      user,
      isHelper,
    }: { user: Principal; isHelper: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setHelperAdmin(user, isHelper);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.cleanupIncompleteUsers();
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(`Database cleaned: ${count} incomplete users removed`);
    },
    onError: () => {
      toast.error("Cleanup failed. Please try again.");
    },
  });

  const handleAction = async (
    user: AdminUserView,
    action:
      | "approve"
      | "reject"
      | "block"
      | "unblock"
      | "makeHelper"
      | "removeHelper",
  ) => {
    const name = user.profile.username || "User";
    try {
      if (action === "approve") {
        await updateStatus.mutateAsync({
          user: user.principal,
          status: { approved: null },
        });
        toast.success(`${name} approved successfully`);
      } else if (action === "reject") {
        await updateStatus.mutateAsync({
          user: user.principal,
          status: { rejected: null },
        });
        toast.success(`${name} rejected`);
      } else if (action === "block") {
        await updateStatus.mutateAsync({
          user: user.principal,
          status: { blocked: null },
        });
        toast.success(`${name} blocked`);
      } else if (action === "unblock") {
        await updateStatus.mutateAsync({
          user: user.principal,
          status: { approved: null },
        });
        toast.success(`${name} unblocked`);
      } else if (action === "makeHelper") {
        await setHelper.mutateAsync({ user: user.principal, isHelper: true });
        toast.success(`${name} is now a Helper Admin`);
      } else if (action === "removeHelper") {
        await setHelper.mutateAsync({ user: user.principal, isHelper: false });
        toast.success(`${name} removed from Helper Admin`);
      }
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const filtered = (users ?? []).filter((u) => {
    const matchSearch =
      !search ||
      u.profile.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && "pending" in u.status) ||
      (filterStatus === "approved" && "approved" in u.status) ||
      (filterStatus === "rejected" && "rejected" in u.status) ||
      (filterStatus === "blocked" && "blocked" in u.status);
    return matchSearch && matchStatus;
  });

  const counts = {
    total: users?.length ?? 0,
    pending: users?.filter((u) => "pending" in u.status).length ?? 0,
    approved: users?.filter((u) => "approved" in u.status).length ?? 0,
    blocked: users?.filter((u) => "blocked" in u.status).length ?? 0,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 50%, #0d3520 100%)",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "rgba(10,46,26,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-white/60 hover:text-white transition-colors mr-1"
              title="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="text-white font-bold text-base">
            Admin Dashboard
          </span>
          <span className="text-white/40 text-xs hidden sm:block">
            — SIFN Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Cleanup incomplete users"
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="text-white/40 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-ocid="admin.refresh_button"
            onClick={() => refetch()}
            className="text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Users",
              value: counts.total,
              icon: Users,
              color: "text-blue-400",
            },
            {
              label: "Pending",
              value: counts.pending,
              icon: Shield,
              color: "text-amber-400",
            },
            {
              label: "Approved",
              value: counts.approved,
              icon: UserCheck,
              color: "text-green-400",
            },
            {
              label: "Blocked",
              value: counts.blocked,
              icon: UserX,
              color: "text-red-400",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              data-ocid={`admin.stat_card.${i + 1}`}
              className="rounded-2xl p-4 flex flex-col gap-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-white/50 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              data-ocid="admin.search_input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white/5 border-green-800/40 text-white placeholder:text-white/30 focus-visible:ring-green-500"
            />
          </div>
          <select
            data-ocid="admin.status_filter_select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 rounded-xl text-sm text-white bg-white/5 border border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all" className="bg-gray-900">
              All
            </option>
            <option value="pending" className="bg-gray-900">
              Pending
            </option>
            <option value="approved" className="bg-gray-900">
              Approved
            </option>
            <option value="rejected" className="bg-gray-900">
              Rejected
            </option>
            <option value="blocked" className="bg-gray-900">
              Blocked
            </option>
          </select>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {isLoading &&
            [1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32 rounded bg-white/10" />
                    <Skeleton className="h-3 w-48 rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && filtered.length === 0 && (
            <div
              data-ocid="admin.users.empty_state"
              className="rounded-2xl p-10 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No users found</p>
            </div>
          )}

          {!isLoading &&
            filtered.map((user, idx) => {
              const isSelf = user.email === SUPER_ADMIN_EMAIL;
              const roleLabel = adminRoleLabel(user.adminRole);
              const { relation, age } = parseBio(user.profile.bio || "");
              let photoUrl: string | undefined;
              try {
                photoUrl = user.profile.profilePhotoId?.getDirectURL();
              } catch {
                photoUrl = undefined;
              }

              return (
                <div
                  key={user.principal.toString()}
                  data-ocid={`admin.user_card.${idx + 1}`}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: isSelf
                      ? "1px solid rgba(251,191,36,0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-white/10 flex-shrink-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={user.profile.username}
                          className="object-cover w-full h-full rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="bg-green-800 text-white text-sm font-bold">
                          {getInitials(user.profile.username || "??")}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span className="text-white font-semibold text-sm truncate">
                          {user.profile.username || "(No Name)"}
                        </span>
                        {isSelf && (
                          <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                            <Crown className="w-3 h-3" /> You
                          </span>
                        )}
                        {roleLabel && !isSelf && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-300 border-purple-500/30">
                            {roleLabel}
                          </Badge>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor(user.status)}`}
                        >
                          {statusLabel(user.status)}
                        </span>
                      </div>

                      {/* Email */}
                      <p className="text-white/60 text-xs truncate mb-1">
                        📧 {user.email || "—"}
                      </p>

                      {/* Relation & Age row */}
                      <div className="flex flex-wrap gap-3 mb-1">
                        <span className="text-white/50 text-xs">
                          👥{" "}
                          <span className="text-white/70">
                            {relation || "—"}
                          </span>
                        </span>
                        <span className="text-white/50 text-xs">
                          🎂{" "}
                          <span className="text-white/70">
                            {age ? `${age} yrs` : "—"}
                          </span>
                        </span>
                      </div>

                      {/* Signup date */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-white/30 text-[11px]">
                          📅 Signup: {formatDate(user.signupDate)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`admin.user_action_button.${idx + 1}`}
                            className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex-shrink-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-gray-900 border-green-800/40 text-white min-w-[160px]"
                        >
                          {!("approved" in user.status) && (
                            <DropdownMenuItem
                              data-ocid={`admin.approve_button.${idx + 1}`}
                              onClick={() => handleAction(user, "approve")}
                              className="gap-2 text-green-400 hover:bg-green-900/30 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve
                            </DropdownMenuItem>
                          )}
                          {!("rejected" in user.status) && (
                            <DropdownMenuItem
                              data-ocid={`admin.reject_button.${idx + 1}`}
                              onClick={() => handleAction(user, "reject")}
                              className="gap-2 text-amber-400 hover:bg-amber-900/30 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          {!("blocked" in user.status) ? (
                            <DropdownMenuItem
                              data-ocid={`admin.block_button.${idx + 1}`}
                              onClick={() => handleAction(user, "block")}
                              className="gap-2 text-red-400 hover:bg-red-900/30 cursor-pointer"
                            >
                              <UserX className="w-4 h-4" /> Block
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              data-ocid={`admin.unblock_button.${idx + 1}`}
                              onClick={() => handleAction(user, "unblock")}
                              className="gap-2 text-blue-400 hover:bg-blue-900/30 cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" /> Unblock
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          {"helperAdmin" in user.adminRole ? (
                            <DropdownMenuItem
                              data-ocid={`admin.remove_helper_button.${idx + 1}`}
                              onClick={() => handleAction(user, "removeHelper")}
                              className="gap-2 text-orange-400 hover:bg-orange-900/30 cursor-pointer"
                            >
                              <ShieldOff className="w-4 h-4" /> Remove Helper
                              Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              data-ocid={`admin.make_helper_button.${idx + 1}`}
                              onClick={() => handleAction(user, "makeHelper")}
                              className="gap-2 text-purple-400 hover:bg-purple-900/30 cursor-pointer"
                            >
                              <Shield className="w-4 h-4" /> Make Helper Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
