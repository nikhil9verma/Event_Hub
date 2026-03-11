import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/Endpoints'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Email is missing. Please try registering again.')
      return
    }
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code.')
      return
    }

    try {
      setIsLoading(true)
      await authApi.verifyRegistration(email, otp)
      toast.success('Account verified successfully! You can now sign in.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid or expired verification code.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <span className="font-serif font-bold text-ink-900 text-sm">E</span>
          </div>
          <span className="font-serif text-white text-xl">EventHub</span>
        </Link>

        <h1 className="font-serif text-3xl text-white mb-2">Verify Email</h1>
        <p className="text-parchment-200/50 font-sans text-sm mb-8">
          We sent a 6-digit code to <strong className="text-white">{email}</strong>
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">
              Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
              placeholder="000000"
              className="w-full px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-sans text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full btn-gold py-3.5 rounded-xl text-base mt-2"
          >
            {isLoading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>

        <p className="text-parchment-200/40 font-sans text-sm text-center mt-6">
          Didn't receive it? Check your spam folder or{' '}
          <Link to="/register" className="text-gold hover:text-gold-light transition-colors">
            try again
          </Link>
        </p>
      </div>
    </div>
  )
}