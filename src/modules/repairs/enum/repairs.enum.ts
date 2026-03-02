export enum DeviceType {
  LAPTOP = 'laptop',
  DESKTOP = 'desktop',
  MONITOR = 'monitor',
  HARD_DRIVE = 'hard-drive',
  COMPONENT = 'component',
  OTHER = 'other',
}

export enum RepairUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum RepairStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
