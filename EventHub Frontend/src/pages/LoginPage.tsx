import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // UX Fix: Clear the server error message as soon as the user starts typing to correct it
  useEffect(() => {
    if (serverError) setServerError(null)
  }, [watch('email'), watch('password')])

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => authApi.login(data),
    onSuccess: (res: any) => {
      setServerError(null)
      setAuth(res.data.data)
      navigate('/')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || ''
      if (!msg || msg.toLowerCase().includes('bad credentials')) {
        setServerError('Incorrect email or password. Please try again.')
      } else if (msg.toLowerCase().includes('not found')) {
        setServerError('No account found with this email address.')
      } else {
        setServerError(msg)
      }
    },
  })

  return (
    <div className="min-h-screen bg-ink-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-ink-800" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gold/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-ink-900/50" />
        <div className="relative text-center max-w-md">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="font-serif font-bold text-ink-900 text-3xl">E</span>
          </div>
          <h2 className="font-serif text-3xl text-white mb-4">EventHub</h2>
          <p className="text-parchment-100/50 font-sans leading-relaxed">
            Your university's premier event discovery and management platform.
            Connect with your campus community.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[['🎓', 'Academic'], ['🎭', 'Cultural'], ['⚡', 'Tech']].map(([icon, label]) => (
              <div key={label} className="bg-ink-900/50 rounded-xl p-3">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-parchment-100/50 font-sans">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
              <span className="font-serif font-bold text-ink-900 text-sm">E</span>
            </div>
            <span className="font-serif text-white text-xl">EventHub</span>
          </div>

          <h1 className="font-serif text-3xl text-white mb-2">Welcome back</h1>
          <p className="text-parchment-100/50 font-sans text-sm mb-8">Sign in to your account</p>

          <form
            onSubmit={handleSubmit((data) => {
              setServerError(null)
              mutation.mutate(data)
            })}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-sans text-parchment-100/70 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@university.edu"
                className={`w-full px-4 py-3 rounded-xl bg-ink-800 border text-white placeholder-parchment-100/20 font-sans focus:outline-none focus:ring-1 transition-all ${
                  errors.email || serverError
                    ? 'border-crimson/60 focus:border-crimson focus:ring-crimson/30'
                    : 'border-ink-700 focus:border-gold/60 focus:ring-gold/30'
                }`}
              />
              {errors.email && (
                <p className="text-crimson text-xs mt-1 font-sans">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-sans text-parchment-100/70 mb-1.5">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl bg-ink-800 border text-white placeholder-parchment-100/20 font-sans focus:outline-none focus:ring-1 transition-all ${
                  errors.password || serverError
                    ? 'border-crimson/60 focus:border-crimson focus:ring-crimson/30'
                    : 'border-ink-700 focus:border-gold/60 focus:ring-gold/30'
                }`}
              />
              {errors.password && (
                <p className="text-crimson text-xs mt-1 font-sans">{errors.password.message}</p>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-1.5">
              <Link to="/forgot-password" className="text-xs text-gold hover:underline">
                Forgot?
              </Link>
            </div>

            {/* Uses serverError state — not mutation.isError */}
            {serverError && (
              <div className="flex items-start gap-2.5 bg-crimson/10 border border-crimson/25 rounded-xl px-4 py-3">
                <span className="text-crimson flex-shrink-0 mt-0.5">⚠</span>
                <p className="text-crimson text-sm font-sans leading-snug">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full btn-gold py-3.5 rounded-xl text-base mt-2 disabled:opacity-60"
            >
              {mutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-parchment-100/40 font-sans text-sm text-center mt-6">
            No account?{' '}
            <Link to="/register" className="text-gold hover:underline transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}