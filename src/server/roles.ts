export enum UserRole {
  ADMIN = "ADMIN",
  INVENTORY = "INVENTORY",
  CUSTOMER = "CUSTOMER",
}

/** Roles allowed into the back-office. */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.INVENTORY];
