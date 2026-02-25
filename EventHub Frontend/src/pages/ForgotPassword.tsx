import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/Endpoints'

// Schema for Step 1
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Schema for Step 2
const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')

  const emailForm = useForm({ resolver: zodResolver(emailSchema) })
  const resetForm = useForm({ resolver: zodResolver(resetSchema) })

  // Mutation to send OTP
  const forgotPasswordMutation = useMutation({
    mutationFn: (data: { email: string }) => authApi.forgotPassword(data.email),
    onSuccess: (_, variables) => {
      setEmail(variables.email)
      setStep(2)
      toast.success('Reset code sent to your email!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send reset code')
    }
  })

  // Mutation to reset password
  const resetPasswordMutation = useMutation({
    mutationFn: (data: any) => authApi.resetPassword({ 
      email, 
      otp: data.otp, 
      newPassword: data.newPassword 
    }),
    onSuccess: () => {
      toast.success('Password reset successfully! Please sign in.')
      navigate('/login')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid OTP or expired')
    }
  })

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <span className="font-serif font-bold text-ink-900 text-sm">E</span>
          </div>
          <span className="font-serif text-white text-xl">EventHub</span>
        </Link>

        {step === 1 ? (
          <div className="animate-fade-in">
            <h1 className="font-serif text-3xl text-white mb-2">Reset Password</h1>
            <p className="text-parchment-200/50 font-sans text-sm mb-8">
              Enter your email and we'll send you a code to reset your password.
            </p>

            <form onSubmit={emailForm.handleSubmit((d: any) => forgotPasswordMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">Email</label>
                <input
                  {...emailForm.register('email')}
                  type="email"
                  autoComplete="email" // Explicitly marks this as the email field
                  placeholder="you@university.edu"
                  className="w-full px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-sans focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                />
                {emailForm.formState.errors.email && (
                  <p className="text-crimson text-xs mt-1 font-sans">{emailForm.formState.errors.email.message as string}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full btn-gold py-3.5 rounded-xl text-base mt-2"
              >
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h1 className="font-serif text-3xl text-white mb-2">Create New Password</h1>
            <p className="text-parchment-200/50 font-sans text-sm mb-8">
              Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
            </p>

            <form onSubmit={resetForm.handleSubmit((d: any) => resetPasswordMutation.mutate(d))} className="space-y-4">

    {/* THE FIX: The Honeypot. This goes at the very top so the browser fills these instead of the OTP field. */}
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
        <input type="email" autoComplete="username" defaultValue={email} tabIndex={-1} />
        <input type="password" autoComplete="current-password" tabIndex={-1} />
    </div>

    {/* 1. OTP Field */}
    <div>
        <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">6-Digit OTP</label>
        <input
            {...resetForm.register('otp')}
            type="text"
            inputMode="numeric" 
            maxLength={6}
            placeholder="000000"
            autoComplete="one-time-code"
            className="w-full tracking-[0.5em] text-center text-xl px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-mono focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
        />
        {resetForm.formState.errors.otp && (
            <p className="text-crimson text-xs mt-1 font-sans">{resetForm.formState.errors.otp.message as string}</p>
        )}
    </div>

    {/* 2. New Password Field */}
    <div>
        <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">New Password</label>
        <input
            {...resetForm.register('newPassword')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-sans focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
        />
        {resetForm.formState.errors.newPassword && (
            <p className="text-crimson text-xs mt-1 font-sans">{resetForm.formState.errors.newPassword.message as string}</p>
        )}
    </div>

    {/* 3. Confirm Password Field */}
    <div>
        <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">Confirm New Password</label>
        <input
            {...resetForm.register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-sans focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
        />
        {resetForm.formState.errors.confirmPassword && (
            <p className="text-crimson text-xs mt-1 font-sans">{resetForm.formState.errors.confirmPassword.message as string}</p>
        )}
    </div>

    <button
        type="submit"
        disabled={resetPasswordMutation.isPending}
        className="w-full btn-gold py-3.5 rounded-xl text-base mt-2"
    >
        {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
    </button>

    <button
        type="button"
        onClick={() => setStep(1)}
        className="w-full text-parchment-200/40 text-sm hover:text-white transition-colors mt-4"
    >
        ← Back to Email
    </button>
</form>
          </div>
        )}

        {step === 1 && (
          <p className="text-parchment-200/40 font-sans text-sm text-center mt-6">
            Remembered your password?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}