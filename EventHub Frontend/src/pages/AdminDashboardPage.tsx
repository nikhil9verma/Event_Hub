import { useEffect, useState } from 'react';
import { adminApi } from '../api/Endpoints'; // adjust path if needed
import { toast } from 'react-toastify';

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    try {
      const res = await adminApi.getPendingHostRequests();
      setRequests(res.data.data);
    } catch (error) {
      toast.error("Failed to load host requests");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await adminApi.approveHost(id);
      toast.success("Host approved!");
      fetchRequests(); // Refresh the list
    } catch (error) {
      toast.error("Error approving host");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await adminApi.rejectHost(id);
      toast.info("Host request rejected.");
      fetchRequests(); // Refresh the list
    } catch (error) {
      toast.error("Error rejecting host");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      <h2 className="text-xl font-semibold mb-4">Pending Host Requests</h2>
      
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests right now.</p>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="p-4 border rounded shadow-sm flex justify-between items-center">
              <div>
                {/* FIX: Added question marks here! */}
                <p className="font-bold">{req.user?.name || "Unknown User"}</p>
                <p className="text-sm text-gray-600">{req.user?.email || "No email provided"}</p>
                <p className="text-sm italic mt-1">Status: {req.status}</p>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleReject(req.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}