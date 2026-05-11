export type UserRole = 'STUDENT' | 'VENDOR' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  fullName: string;
  createdAt: string;
}

export interface Student {
  id: string;
  userId: string;
  university: string;
  studentIdImageUrl: string | null;
  schoolEmail: string | null;
  schoolEmailVerified: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

export interface StudentProfile extends User {
  student: Student;
}
