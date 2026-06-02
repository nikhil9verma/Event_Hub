import { useEffect, useState } from 'react';
import { adminApi } from '../api/Endpoints'; 
import toast from 'react-hot-toast'; 
import { useAuthStore } from '../store/authStore';

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuthStore();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [requestsRes, staffRes] = await Promise.all([
        adminApi.getPendingHostRequests(),
        adminApi.getHostsAndAdmins()
      ]);
      setRequests(requestsRes.data.data || []);
      setStaff(staffRes.data.data || []);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Request Handlers ───
  const handleApprove = async (id: number) => {
    try {
      await adminApi.approveHost(id);
      toast.success("Host approved!");
      fetchData(); 
    } catch (error) {
      toast.error("Error approving host");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await adminApi.rejectHost(id);
      toast.success("Host request rejected.");
      fetchData(); 
    } catch (error) {
      toast.error("Error rejecting host");
    }
  };

  // ─── Demote Handler ───
  const handleDemote = async (id: number) => {
    if (!window.confirm("Are you sure you want to demote this user to a Student? They will lose the ability to create and manage events.")) return;
    
    try {
      await adminApi.demoteToStudent(id);
      toast.success("User has been demoted to Student.");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error demoting user");
    }
  };

  return (
    <div className="page-container py-10 max-w-5xl animate-fade-in">
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl text-ink-900">Super Admin Dashboard</h1>
        <p className="text-ink-600/60 font-sans mt-2">Manage platform access, host applications, and system roles.</p>
      </div>
      
      <div className="space-y-12">
        
        {/* ─── PENDING REQUESTS SECTION ─── */}
        <section>
          <h2 className="font-serif text-2xl text-ink-900 mb-6 flex items-center gap-2">
            Pending Host Requests
            {requests.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </h2>
          
          {isLoading ? (
            <div className="h-32 bg-ink-50 rounded-xl animate-pulse" />
          ) : requests.length === 0 ? (
            <div className="p-8 border border-ink-200 border-dashed rounded-xl text-center text-ink-500 bg-ink-50/50">
              No pending requests right now. You're all caught up!
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((req) => (
                <div key={req.id} className="p-5 border border-ink-900/10 rounded-xl bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-bold text-ink-900 text-lg">{req.userName || "Unknown User"}</p>
                    <p className="text-sm text-ink-500 font-mono">{req.userEmail || "No email provided"}</p>
                    {req.reason && (
                      <p className="text-sm text-ink-700 mt-2 bg-ink-50 p-3 rounded-lg border border-ink-100 italic">
                        "{req.reason}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => handleApprove(req.id)} className="flex-1 md:flex-none bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm">
                      Approve
                    </button>
                    <button onClick={() => handleReject(req.id)} className="flex-1 md:flex-none border border-red-200 text-red-600 font-bold px-6 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── ACTIVE STAFF SECTION ─── */}
        <section>
          <h2 className="font-serif text-2xl text-ink-900 mb-6">Active Hosts & Admins</h2>
          
          {isLoading ? (
            <div className="h-32 bg-ink-50 rounded-xl animate-pulse" />
          ) : staff.length === 0 ? (
            <div className="p-8 border border-ink-200 border-dashed rounded-xl text-center text-ink-500 bg-ink-50/50">
              No active hosts found.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-ink-900/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ink-50/50 border-b border-ink-900/10 text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {staff.map((member) => {
                    const isMe = currentUser?.id === member.id;
                    const isSuperAdmin = member.role === 'SUPER_ADMIN';

                    return (
                      <tr key={member.id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-ink-900">{member.name} {isMe && <span className="text-xs font-normal text-ink-400 ml-2">(You)</span>}</p>
                          <p className="text-sm text-ink-500 font-mono">{member.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${isSuperAdmin ? 'bg-ink-900 text-gold' : 'bg-gold/10 text-gold-dark'}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isMe || isSuperAdmin ? (
                            <span className="text-xs text-ink-400 italic">Protected</span>
                          ) : (
                            <button 
                              onClick={() => handleDemote(member.id)}
                              className="text-xs font-bold text-red-600 hover:text-white border border-red-200 hover:bg-red-600 hover:border-red-600 px-4 py-2 rounded-lg transition-colors"
                            >
                              Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}