export interface Player {
  _id: string;
  name: string;
  contactNumber?: string;
  isActive: boolean;
  registrationStatus?: 'pending' | 'approved';
  createdAt: string;
}
