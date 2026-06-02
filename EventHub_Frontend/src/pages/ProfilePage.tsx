import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { getImageUrl } from '../components/event/EventCard'

// ─── EMAIL CHANGE MODAL COMPONENT ───
function EmailChangeModal({ isOpen, onClose, currentEmail }: { isOpen: boolean; onClose: () => void; currentEmail: string }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')
  
  // ─── FIX 1: Use setAuth instead of login ───
  const { setAuth } = useAuthStore() 

  const requestMutation = useMutation({
    mutationFn: () => authApi.requestEmailChange(newEmail),
    onSuccess: (res) => {
      toast.success(res.data.message || 'OTP sent to your new email!')
      setStep(2)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send OTP')
  })

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyEmailChange(newEmail, otp),
    onSuccess: (res) => {
      const data = res.data.data
      
      // ─── FIX 2: Call setAuth with the response data ───
      setAuth(data) 
      
      toast.success('Email updated successfully!')
      onClose()
      setStep(1)
      setNewEmail('')
      setOtp('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Invalid OTP')
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden animate-fade-in p-6">
        <h2 className="font-serif text-xl text-ink-900 mb-1">Update Email Address</h2>
        <p className="text-xs text-ink-500 mb-6">Current email: <span className="font-bold">{currentEmail}</span></p>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your new email"
                className="w-full px-4 py-3 bg-white border border-ink-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 bg-ink-50 text-ink-600 rounded-xl text-sm font-medium hover:bg-ink-100 transition-colors">Cancel</button>
              <button onClick={() => requestMutation.mutate()} disabled={!newEmail || requestMutation.isPending} className="flex-1 py-3 btn-gold rounded-xl text-sm">
                {requestMutation.isPending ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-600 bg-sage/10 border border-sage/20 p-3 rounded-lg">
              We sent a 6-digit code to <b className="text-ink-900">{newEmail}</b>.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Verification Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 bg-white border border-ink-200 rounded-xl text-sm font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-ink-50 text-ink-600 rounded-xl text-sm font-medium hover:bg-ink-100 transition-colors">Back</button>
              <button onClick={() => verifyMutation.mutate()} disabled={otp.length !== 6 || verifyMutation.isPending} className="flex-1 py-3 btn-gold rounded-xl text-sm">
                {verifyMutation.isPending ? 'Verifying...' : 'Verify & Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PROFILE PAGE COMPONENT ───
export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    course: user?.course || '',
    batch: user?.batch || ''
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile().then(r => r.data.data),
  })

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateProfile(formData),
    onSuccess: (res) => {
      const data = res.data.data
      
      // ─── FIX 3: Use getState().setAuth(data) ───
      useAuthStore.getState().setAuth(data) 
      
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
      toast.success('Profile updated!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed')
  })

  // ─── FIX 4: Correctly pass the File directly to uploadAvatar ───
  const avatarMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Avatar updated!')
    }
  })

  if (isLoading) return <div className="page-container py-12"><div className="skeleton h-64 rounded-2xl" /></div>

  return (
    <div className="page-container py-10 max-w-4xl animate-fade-in">
      <h1 className="font-serif text-3xl md:text-4xl text-ink-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-2xl border border-ink-900/5 shadow-sm p-6 md:p-8">
        
        {/* AVATAR UPLOAD SECTION */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-ink-900/5 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-ink-900 border-4 border-white shadow-lg">
              {profile?.profileImageUrl ? (
                <img src={getImageUrl(profile.profileImageUrl)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gold font-serif text-3xl">
                  {profile?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-gold text-ink-900 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform">
              <span className="text-sm">📷</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) avatarMutation.mutate(file)
                }}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-serif text-2xl text-ink-900">{profile?.name}</h2>
            <p className="text-sm text-ink-500 font-mono mt-1">{profile?.role}</p>
          </div>
        </div>

        {/* BASIC INFO FORM */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-ink-900">Personal Information</h3>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-gold hover:text-gold-dark uppercase tracking-wider">
                Edit Details
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Full Name</label>
              <input
                disabled={!isEditing}
                type="text"
                value={isEditing ? formData.name : profile?.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-ink-50/50 border border-ink-200 rounded-xl text-sm outline-none disabled:opacity-70 disabled:bg-ink-50"
              />
            </div>
            
            {/* ─── EMAIL DISPLAY WITH CHANGE BUTTON ─── */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Email Address</label>
              <div className="flex gap-2">
                <input
                  disabled
                  type="email"
                  value={profile?.email}
                  className="w-full px-4 py-3 bg-ink-50 border border-ink-200 rounded-xl text-sm outline-none opacity-70 font-mono"
                />
                {!isEditing && (
                  <button 
                    onClick={() => setIsEmailModalOpen(true)}
                    className="px-4 py-3 border border-ink-200 text-ink-600 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-ink-50 hover:text-ink-900 transition-colors shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Course</label>
              <input
                disabled={!isEditing}
                type="text"
                value={isEditing ? formData.course : profile?.course}
                onChange={e => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-4 py-3 bg-ink-50/50 border border-ink-200 rounded-xl text-sm outline-none disabled:opacity-70 disabled:bg-ink-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">Batch / Year</label>
              <input
                disabled={!isEditing}
                type="text"
                value={isEditing ? formData.batch : profile?.batch}
                onChange={e => setFormData({ ...formData, batch: e.target.value })}
                className="w-full px-4 py-3 bg-ink-50/50 border border-ink-200 rounded-xl text-sm outline-none disabled:opacity-70 disabled:bg-ink-50"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-ink-900/5">
              <button 
                onClick={() => {
                  setFormData({ name: profile.name, course: profile.course, batch: profile.batch })
                  setIsEditing(false)
                }} 
                className="px-6 py-2.5 rounded-xl border border-ink-200 text-ink-600 font-medium hover:bg-ink-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateMutation.mutate()} 
                disabled={updateMutation.isPending}
                className="px-6 py-2.5 btn-gold rounded-xl font-medium"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <EmailChangeModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        currentEmail={profile?.email || ''} 
      />
    </div>
  )
}