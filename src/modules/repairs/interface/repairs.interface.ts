import { DeviceType, RepairStatus, RepairUrgency } from '../enum/repairs.enum';

export interface IRepairRequest {
  fullName: string;
  email: string;
  phone: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  issueDescription: string;
  urgency: RepairUrgency;
}

export interface ICreateRepair {
  fullName: string;
  email: string;
  phone: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  issueDescription: string;
  urgency: RepairUrgency;
}

export interface IUpdateRepairStatus {
  status: RepairStatus;
  adminNotes?: string;
}

export interface IRepairResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  issueDescription: string;
  urgency: RepairUrgency;
  status: RepairStatus;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
