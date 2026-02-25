export type Role = 'STUDENT' | 'HOST' | 'SUPER_ADMIN'
export type EventStatus = 'ACTIVE' | 'FULL' | 'SUSPENDED' | 'COMPLETED'
export type RegistrationStatus = 'REGISTERED' | 'WAITLIST' | 'CANCELLED'
export type HostRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface User {
  id: number
  name: string
  email: string
  course?: string
  batch?: string
  role: Role
  profileImageUrl?: string
  createdAt: string
}
// Add this to your types.ts file
export interface Attendee {
  userId: number;
  name: string;
  email: string;
  course?: string;
  batch?: string;
  status: RegistrationStatus;
  registeredAt: string;
}
export interface AuthResponse {
  token: string
  type: string
  userId: number
  course?: string
  batch?: string
  name: string
  email: string
  role: Role
  profileImageUrl?: string
}

export interface Event {
  id: number
  title: string
  description: string
  eventDate: string
  eventEndTime?: string
  venue: string
  category: string
  maxParticipants: number
  registrationDeadline: string
  posterUrl?: string       // hero image — event detail page
  cardImageUrl?: string    // thumbnail — event listing cards
  status: EventStatus
  reminderHours: number
  hostId: number
  hostName: string
  hostImageUrl?: string
  registrationCount: number
  waitlistCount: number
  availableSeats: number
  trending: boolean
  averageRating?: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  currentUserRegistrationStatus?: RegistrationStatus
}

export interface HostRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  status: HostRequestStatus
  rejectionReason?: string
  createdAt: string
  resolvedAt?: string
}

export interface Registration {
  id: number
  userId: number
  userName: string
  eventId: number
  eventTitle: string
  status: RegistrationStatus
  registeredAt: string
}

export interface Comment {
  id: number
  userId: number
  userName: string
  userImageUrl?: string
  message: string
  createdAt: string
}

export interface Rating {
  id: number
  userId: number
  userName: string
  stars: number
  createdAt: string
}

export interface Notification {
  id: number
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface Analytics {
  eventId: number
  eventTitle: string
  totalRegistrations: number
  waitlistCount: number
  fillPercentage: number
  maxParticipants: number
  availableSeats: number
  averageRating?: number
  ratingCount: number
  dailyRegistrationCounts: Array<{ date: string; count: number }>
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  timestamp: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface EventFilters {
  search?: string
  category?: string
  available?: boolean
  trending?: boolean
  dateFrom?: string
  dateTo?: string
  page?: number
  size?: number
}