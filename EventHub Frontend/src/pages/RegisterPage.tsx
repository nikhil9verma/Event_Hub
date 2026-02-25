import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/Endpoints'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  course: z.string().min(2, 'Course is required (e.g. B.Tech CSE)'),
  batch: z.string().min(4, 'Batch year is required (e.g. 2026)'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  })

  // 1. Initial Registration Mutation
  const registerMutation = useMutation({
    mutationFn: (data: Omit<RegisterForm, 'confirmPassword'>) => authApi.register(data),
    onSuccess: (_, variables) => {
      setRegisteredEmail(variables.email);
      setIsVerifying(true);
      toast.success('OTP sent to your email!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  });

  // 2. OTP Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: (otp: string) => authApi.verifyRegistration(registeredEmail, otp),
    onSuccess: (res: any) => {
      setAuth(res.data.data);
      navigate('/');
      toast.success('Welcome to EventHub!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
    }
  });

  const fields = [
    { name: 'name' as const, label: 'Full Name', type: 'text', placeholder: 'Your full name' },
    { name: 'email' as const, label: 'Email Address', type: 'email', placeholder: 'you@university.edu' },
    { name: 'course' as const, label: 'Course', type: 'text', placeholder: 'e.g. B.Tech CSE' }, 
    { name: 'batch' as const, label: 'Batch Year', type: 'text', placeholder: 'e.g. 2026' },
    { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••' },
    { name: 'confirmPassword' as const, label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
  ]

  // === OTP VIEW ===
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✉️</span>
          </div>
          <h1 className="font-serif text-3xl text-white mb-2">Check your email</h1>
          <p className="text-parchment-200/50 font-sans text-sm mb-8">
            We sent a 6-digit code to <br />
            <strong className="text-white">{registeredEmail}</strong>
          </p>

          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            className="w-full text-center tracking-[0.5em] text-3xl px-4 py-4 rounded-xl bg-ink-800 border border-ink-700 text-white font-mono focus:outline-none focus:border-gold/60 transition-all mb-4"
            onChange={(e) => {
              const val = e.target.value;
              // Auto-submit when 6 digits are entered
              if (val.length === 6) {
                verifyMutation.mutate(val);
              }
            }}
          />
          
          <button 
            onClick={() => setIsVerifying(false)}
            className="text-parchment-200/40 text-sm hover:text-white transition-colors"
          >
            ← Back to Registration
          </button>
        </div>
      </div>
    );
  }

  // === REGISTRATION VIEW ===
  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <span className="font-serif font-bold text-ink-900 text-sm">E</span>
          </div>
          <span className="font-serif text-white text-xl">EventHub</span>
        </Link>

        <h1 className="font-serif text-3xl text-white mb-2">Join EventHub</h1>
        <p className="text-parchment-200/50 font-sans text-sm mb-8">
          Create your student account — it's free
        </p>

        <form
          onSubmit={handleSubmit(({ confirmPassword, ...data }) => registerMutation.mutate(data))}
          className="space-y-4"
        >
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-sans text-parchment-200/70 mb-1.5">{field.label}</label>
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl bg-ink-800 border border-ink-700 text-white placeholder-parchment-200/20 font-sans focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
              {errors[field.name] && (
                <p className="text-crimson text-xs mt-1 font-sans">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}

          <p className="text-parchment-200/30 text-xs font-sans">
            By registering, you agree to our Terms of Service.
          </p>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full btn-gold py-3.5 rounded-xl text-base mt-2"
          >
            {registerMutation.isPending ? 'Sending Code...' : 'Create Account'}
          </button>
        </form>

        <p className="text-parchment-200/40 font-sans text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}