type SalesRole = "admin" | "sales";

const ISMAIL_CODES = ["DFW"];
const ALI_CODES = ["HOUAD", "AUSAD", "SANAD", "LOU"];
const RESERVED_CODES = [...ISMAIL_CODES, ...ALI_CODES];

function normalizeName(name: string) {
  return name.trim().toUpperCase();
}

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

export function canAccessCustomerByDisplayName(params: {
  email: string;
  role: SalesRole;
  displayName: string;
}) {
  if (params.role === "admin") return true;

  const email = params.email.toLowerCase();
  const name = normalizeName(params.displayName);

  if (email === "ismail@sales.dallas") {
    return startsWithAny(name, ISMAIL_CODES);
  }

  if (email === "ali@sales.austin") {
    return startsWithAny(name, ALI_CODES);
  }

  if (email === "yusuf@sales.houston") {
    // "Other Yusuf abi" means every account not already mapped above.
    return !startsWithAny(name, RESERVED_CODES);
  }

  // Unknown sales account: deny by default for safety.
  return false;
}

export function filterCustomersForUser<T extends { DisplayName?: string }>(
  customers: T[],
  user: { email: string; role: SalesRole }
) {
  if (user.role === "admin") return customers;
  return customers.filter((c) =>
    canAccessCustomerByDisplayName({
      email: user.email,
      role: user.role,
      displayName: String(c.DisplayName ?? ""),
    })
  );
}
