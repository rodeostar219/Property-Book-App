export type VersionStatus = "Current" | "Update Available" | "Update Required" | "Version Unknown" | "Verification Overdue" | "Exception Approved" | "Not Applicable";

export function calculateVersionStatus(input: {
  installedVersion?: string | null;
  approvedVersion?: string | null;
  required?: boolean;
  applicable?: boolean;
  exceptionApproved?: boolean;
  lastVerifiedDate?: string | Date | null;
  verificationIntervalDays?: number;
  now?: Date;
}): VersionStatus {
  if (input.applicable === false) return "Not Applicable";
  if (input.exceptionApproved) return "Exception Approved";
  if (!input.installedVersion || input.installedVersion.toLowerCase() === "unknown") return "Version Unknown";
  if (input.lastVerifiedDate) {
    const last = new Date(input.lastVerifiedDate).getTime();
    const limit = (input.verificationIntervalDays ?? 30) * 86_400_000;
    if (Number.isFinite(last) && (input.now ?? new Date()).getTime() - last > limit) return "Verification Overdue";
  }
  if (!input.approvedVersion || input.installedVersion === input.approvedVersion) return "Current";
  return input.required === false ? "Update Available" : "Update Required";
}
