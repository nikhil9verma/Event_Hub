import { useEffect, useState } from 'react';
import { adminApi } from '../api/Endpoints'; // Using your standard API import
import toast from 'react-hot-toast'; // Using your standard toast notifications

// Defining the exact shape of the data your Spring Boot backend sends
interface HostRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  reason: string;
  requestedAt: string;
}

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<HostRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getPendingHostRequests();
      setRequests(res.data.data || []);
    } catch (error: any) {
      toast.error("Failed to load host requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await adminApi.approveHost(id);
      toast.success("Host approved successfully! 🎉");
      fetchRequests(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error approving host");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await adminApi.rejectHost(id);
      toast.success("Host request rejected.");
      fetchRequests(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error rejecting host");
    }
  };

  return (
    <div className="page-container py-10 max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink-900">Super Admin Dashboard</h1>
        <p className="text-ink-600/60 font-sans text-sm mt-1">
          Review and manage pending host applications.
        </p>
      </div>
      
      <div className="card p-6">
        <h2 className="font-serif text-xl mb-4">Pending Host Requests</h2>
        
        {isLoading ? (
          <p className="text-ink-600/60 font-sans animate-pulse">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-ink-600/60 font-sans italic">No pending requests right now. You're all caught up!</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div 
                key={req.id} 
                className="p-5 border border-ink-900/10 rounded-xl bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-gold/30 transition-colors"
              >
                <div className="flex-1">
                  {/* THE FIX: Matching the exact variables from HostRequestResponse.java */}
                  <p className="font-bold text-ink-900 text-lg">{req.userName || "Unknown User"}</p>
                  <p className="text-sm text-ink-600 font-sans">{req.userEmail || "No email provided"}</p>
                  
                  {/* If the student provided a reason to become a host, show it here! */}
                  {req.reason && (
                    <p className="text-sm text-ink-900/80 font-sans mt-3 italic bg-gray-50 p-3 rounded border border-gray-100">
                      "{req.reason}"
                    </p>
                  )}
                  
                  <p className="text-xs font-sans mt-3 text-ink-600/50 uppercase tracking-wider font-semibold">
                    Status: <span className="text-yellow-600">{req.status}</span>
                  </p>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="btn-gold px-6 py-2 w-full sm:w-auto text-sm"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(req.id)}
                    className="btn-outline px-6 py-2 w-full sm:w-auto text-sm !border-red-600 !text-red-600 hover:!bg-red-600 hover:!text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}