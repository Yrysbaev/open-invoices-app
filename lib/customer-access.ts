type SalesRole = "admin" | "sales";

const ISMAIL_CODES = ["DFW"];
const ALI_CODES = ["HOUAD", "AUSAD", "SANAD", "LOU"];
const RESERVED_CODES = [...ISMAIL_CODES, ...ALI_CODES];

function normalizeName(name: string) {
  return name.trim().toUpperCase();
}

function getTopLevelGroup(value: string) {
  const normalized = normalizeName(value);
  const [group] = normalized.split(":");
  return group?.trim() ?? normalized;
}

function isGroupIn(group: string, allowedGroups: string[]) {
  return allowedGroups.includes(group);
}

export function canAccessCustomerByDisplayName(params: {
  email: string;
  role: SalesRole;
  displayName: string; // can be DisplayName or FullyQualifiedName
}) {
  if (params.role === "admin") return true;

  const email = params.email.toLowerCase();
  const group = getTopLevelGroup(params.displayName);

  if (email === "ismail@sales.dallas") {
    return isGroupIn(group, ISMAIL_CODES);
  }

  if (email === "ali@sales.austin") {
    return isGroupIn(group, ALI_CODES);
  }

  if (email === "yusuf@sales.houston") {
    // "Other Yusuf abi" means every account not already mapped above.
    return !isGroupIn(group, RESERVED_CODES);
  }

  // Unknown sales account: deny by default for safety.
  return false;
}

export function filterCustomersForUser<
  T extends { DisplayName?: string; FullyQualifiedName?: string }
>(
  customers: T[],
  user: { email: string; role: SalesRole }
) {
  if (user.role === "admin") return customers;
  return customers.filter((c) =>
    canAccessCustomerByDisplayName({
      email: user.email,
      role: user.role,
      displayName: String(c.FullyQualifiedName ?? c.DisplayName ?? ""),
    })
  );
}
