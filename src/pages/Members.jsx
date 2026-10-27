import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Member } from "@/api/dbClient";
import { useAuth } from "@/context/AuthContext";
import { UserX } from "lucide-react";

const ROLE_RANK = { Customer: 0, Employee: 1, Manager: 2, Admin: 3 };

const ROLE_BADGE = {
    Admin:    { bg: "#f3e8ff", text: "#7c3aed" },
    Manager:  { bg: "#dbeafe", text: "#1d4ed8" },
    Employee: { bg: "#dcfce7", text: "#15803d" },
    Customer: { bg: "#f1f5f9", text: "#64748b" },
};

function assignableRoles(currentUserRole) {
    if (currentUserRole === "Admin")   return ["Admin", "Manager", "Employee", "Customer"];
    if (currentUserRole === "Manager") return ["Employee", "Customer"];
    return [];
}

export default function Members() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState(null);

    const { data: members = [], isLoading, isError } = useQuery({
        queryKey: ["members"],
        queryFn: async () => {
            const result = await Member.list();
            return Array.isArray(result) ? result : [];
        },
    });

    const updateRole = useMutation({
        mutationFn: ({ userId, role }) => Member.updateRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries(["members"]);
            setError(null);
        },
        onError: (err) => {
            setError(err.response?.data?.error ?? "Failed to update role");
        },
    });

    const removeMember = useMutation({
        mutationFn: (userId) => Member.remove(userId),
        onSuccess: () => {
            queryClient.invalidateQueries(["members"]);
            setError(null);
        },
        onError: (err) => {
            setError(err.response?.data?.error ?? "Failed to remove member");
        },
    });

    const roles = assignableRoles(user?.role);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500">
                Loading members...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500">
                Failed to load members.
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
                <p className="text-gray-500 mt-2">Manage roles for everyone in your business</p>
            </div>

            {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                            <th className="text-left px-6 py-3 font-medium text-gray-500">Joined</th>
                            {user?.role === "Admin" && (
                                <th className="px-6 py-3"/>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => {
                            const isMe    = member.id === user?.id;
                            const badge   = ROLE_BADGE[member.role] ?? ROLE_BADGE.Customer;
                            const canEdit = !isMe && roles.includes(member.role) || (!isMe && roles.length > 0);

                            return (
                                <tr key={member.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {member.full_name}
                                        {isMe && (
                                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{member.email}</td>
                                    <td className="px-6 py-4">
                                        {canEdit && roles.length > 0 ? (
                                            <select
                                                value={member.role}
                                                disabled={updateRole.isPending}
                                                onChange={(e) =>
                                                    updateRole.mutate({ userId: member.id, role: e.target.value })
                                                }
                                                className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                style={{ background: badge.bg, color: badge.text }}
                                            >
                                                {roles.map((r) => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span
                                                className="text-xs font-semibold px-2 py-1 rounded-full"
                                                style={{ background: badge.bg, color: badge.text }}
                                            >
                                                {member.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(member.joined_at).toLocaleDateString()}
                                    </td>
                                    {user?.role === "Admin" && (
                                        <td className="px-6 py-4 text-right">
                                            {!isMe && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Remove ${member.full_name} from this business?`)) {
                                                            removeMember.mutate(member.id);
                                                        }
                                                    }}
                                                    disabled={removeMember.isPending}
                                                    title="Remove member"
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <UserX className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {members.length === 0 && (
                    <p className="text-center text-gray-400 py-12">No members found.</p>
                )}
            </div>
        </div>
    );
}
