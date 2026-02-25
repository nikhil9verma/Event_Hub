import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Avatar from '@mui/material/Avatar'
import { authApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../components/event/EventCard'

// 1. ADDED COURSE & BATCH TO SCHEMA
const profileSchema = z.object({ 
  name: z.string().min(2, "Name must be at least 2 characters"),
  course: z.string().min(2, "Course is required"),
  batch: z.string().min(4, "Batch is required"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword']
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile')
  const applicationClicks = useRef<number[]>([])
  
  // 2. MAPPED COURSE & BATCH TO DEFAULT VALUES
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { 
      name: user?.name || '',
      course: user?.course || '',
      batch: user?.batch || ''
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  // 3. UPDATED MUTATION TO SAVE NEW FIELDS TO LOCAL STATE
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (res: any) => {
      updateUser({ 
        name: res.data.data.name,
        course: res.data.data.course,
        batch: res.data.data.batch
      })
      toast.success('Profile updated!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: authApi.uploadAvatar,
    onSuccess: (res: any) => {
      updateUser({ profileImageUrl: res.data.data })
      toast.success('Avatar updated!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Password changed successfully!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const applyHostMutation = useMutation({
    mutationFn: authApi.applyForHost,
    onSuccess: () => {
      toast.success('Host application submitted! We will review it shortly. 🚀')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const handleApplyHost = () => {
    const now = Date.now();
    const twoMinutesAgo = now - 120 * 1000;
    
    applicationClicks.current = applicationClicks.current.filter(time => time > twoMinutesAgo);
    
    if (applicationClicks.current.length >= 5) {
      toast.success('Host application submitted! We will review it shortly. 🚀');
      return;
    }
    
    applicationClicks.current.push(now);
    applyHostMutation.mutate();
  }

  const deleteAccountMutation = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      logout()
      toast.success('Account deleted.')
      navigate('/')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
      uploadAvatarMutation.mutate(file)
    }
  }

  const tabs = [
    { key: 'profile', label: '👤 Profile' },
    { key: 'password', label: '🔒 Password' },
    { key: 'account', label: '⚙️ Account' },
  ]

  return (
    <div className="page-container py-10 max-w-2xl animate-fade-in">
      <h1 className="font-serif text-3xl text-ink-900 mb-8">Profile Settings</h1>

      {/* Avatar & Info Display */}
      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="relative group">
          <Avatar
            src={avatarPreview || getImageUrl(user?.profileImageUrl)}
            sx={{ width: 80, height: 80, fontSize: 28 }}
            className="border-2 border-gold/30"
          >
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-ink-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span className="text-white text-xs font-sans">Edit</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <p className="font-serif text-xl text-ink-900">{user?.name}</p>
          <p className="text-ink-600/50 font-sans text-sm">{user?.email}</p>
          
          {/* 4. NEW DISPLAY FOR COURSE & BATCH */}
          {(user?.course || user?.batch) && (
            <p className="text-ink-700 font-sans text-sm mt-0.5">
              🎓 {user?.course} <span className="text-ink-600/40 px-1">•</span> Batch of {user?.batch}
            </p>
          )}

          <span className="badge badge-ink mt-2 capitalize">{user?.role?.toLowerCase()}</span>
        </div>
        {uploadAvatarMutation.isPending && (
          <span className="text-xs text-gold font-sans ml-auto animate-pulse">Uploading...</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-parchment-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-sans transition-all ${activeTab === tab.key
                ? 'bg-white shadow-sm text-ink-900 font-medium'
                : 'text-ink-600/60 hover:text-ink-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-serif text-xl mb-5">Personal Information</h2>
          <form onSubmit={profileForm.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-4">
            
            <div>
              <label className="label">Full Name</label>
              <input {...profileForm.register('name')} className="input-field" />
              {profileForm.formState.errors.name && (
                <p className="text-crimson text-xs mt-1 font-sans">{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* 5. NEW INPUTS FOR COURSE & BATCH */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Course</label>
                <input {...profileForm.register('course')} className="input-field" placeholder="e.g. B.Tech CSE" />
                {profileForm.formState.errors.course && (
                  <p className="text-crimson text-xs mt-1 font-sans">{profileForm.formState.errors.course.message}</p>
                )}
              </div>
              <div>
                <label className="label">Batch Year</label>
                <input {...profileForm.register('batch')} className="input-field" placeholder="e.g. 2026" />
                {profileForm.formState.errors.batch && (
                  <p className="text-crimson text-xs mt-1 font-sans">{profileForm.formState.errors.batch.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input value={user?.email} disabled className="input-field bg-parchment-100 text-ink-600/50" />
              <p className="text-xs text-ink-600/40 font-sans mt-1">Email cannot be changed.</p>
            </div>
            
            <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary">
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Password tab */}
      {activeTab === 'password' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-serif text-xl mb-5">Change Password</h2>
          <form onSubmit={passwordForm.handleSubmit(({ confirmPassword, ...data }) => changePasswordMutation.mutate(data))} className="space-y-4">
            {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map(field => (
              <div key={field}>
                <label className="label">
                  {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                </label>
                <input
                  {...passwordForm.register(field)}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {passwordForm.formState.errors[field] && (
                  <p className="text-crimson text-xs mt-1 font-sans">{passwordForm.formState.errors[field]?.message}</p>
                )}
              </div>
            ))}
            <button type="submit" disabled={changePasswordMutation.isPending} className="btn-primary">
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Account tab */}
      {activeTab === 'account' && (
        <div className="space-y-4 animate-fade-in">
          {user?.role === 'STUDENT' && (
            <div className="card p-6">
              <h2 className="font-serif text-xl mb-2">Become a Host</h2>
              <p className="text-ink-600/60 font-sans text-sm mb-4">
                As a host, you can create and manage events, view analytics, and build your community.
              </p>
              <button
                onClick={handleApplyHost}
                disabled={applyHostMutation.isPending}
                className="btn-outline px-4 py-2"
              >
                {applyHostMutation.isPending ? 'Applying...' : '🚀 Apply to Become a Host'}
              </button>
            </div>
          )}

          <div className="card p-6 border border-crimson/15">
            <h2 className="font-serif text-xl text-crimson mb-2">Danger Zone</h2>
            <p className="text-ink-600/60 font-sans text-sm mb-4">
              Permanently deletes your account. All registrations will be cancelled and hosted events will be suspended.
              This action <strong>cannot</strong> be undone.
            </p>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="border border-crimson/30 text-crimson px-4 py-2 rounded-lg font-sans font-medium text-sm hover:bg-crimson/5 transition-colors"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex gap-3 items-center">
                <span className="text-sm font-sans text-ink-700">Are you absolutely sure?</span>
                <button
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="bg-crimson text-white px-4 py-2 rounded-lg font-sans font-medium text-sm hover:bg-crimson/80 transition-colors disabled:opacity-50"
                >
                  {deleteAccountMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}