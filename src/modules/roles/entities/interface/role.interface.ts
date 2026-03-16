export interface iRoleSuperAdmin {
  id: string;
  name: string;
}

export interface IRoleSuperAdminById {
  id: string;
  name: string;
  description: string;
  permissions: object;
  createdAt: Date;
  updatedAt: Date;
}
