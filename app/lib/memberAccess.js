const ADMIN_ROLES = new Set(["admin", "superadmin"]);

export function normalizeGender(gender) {
  if (!gender || typeof gender !== "string") return null;
  const normalized = gender.trim().toLowerCase();
  if (normalized === "male" || normalized === "female") return normalized;
  return null;
}

function inferGendersFromRoleName(roleName) {
  const normalizedRole = (roleName || "").toLowerCase();
  if (normalizedRole.includes("male")) return ["male"];
  if (normalizedRole.includes("female")) return ["female"];
  return [];
}

function normalizeMemberAccess(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "both") {
    return normalized;
  }
  return null;
}

export async function resolveAllowedGenders(prisma, roleName) {
  const normalizedRole = (roleName || "").toLowerCase();

  if (ADMIN_ROLES.has(normalizedRole)) {
    return null;
  }

  const role = await prisma.role.findFirst({
    where: { name: roleName },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  const permissionCodes = new Set(
    (role?.permissions || []).map((rp) => rp.permission?.code).filter(Boolean)
  );

  // Backward compatibility: legacy wide member-view permission means both genders.
  if (permissionCodes.has("members:view")) {
    return ["male", "female"];
  }

  const allowed = [];
  if (permissionCodes.has("members:view:male")) allowed.push("male");
  if (permissionCodes.has("members:view:female")) allowed.push("female");

  if (allowed.length > 0) return allowed;
  return inferGendersFromRoleName(roleName);
}

export async function resolveAllowedGendersForUser(prisma, userLike) {
  let roleName = userLike?.role || "";
  let memberAccess = normalizeMemberAccess(userLike?.memberAccess);
  const userId = Number(userLike?.id);

  // Always prefer the latest DB value so access changes take effect immediately,
  // even if the user session token is stale.
  if (Number.isInteger(userId) && userId > 0) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, memberAccess: true },
    });
    if (dbUser) {
      roleName = dbUser.role || roleName;
      memberAccess = normalizeMemberAccess(dbUser.memberAccess) || memberAccess;
    }
  }

  const normalizedRole = roleName.toLowerCase();
  if (ADMIN_ROLES.has(normalizedRole)) {
    return null;
  }

  if (memberAccess === "male") return ["male"];
  if (memberAccess === "female") return ["female"];
  if (memberAccess === "both") return ["male", "female"];

  return resolveAllowedGenders(prisma, roleName);
}

export function buildGenderAccessWhere(allowedGenders) {
  if (!allowedGenders) return {};
  const normalized = Array.from(
    new Set(allowedGenders.map((g) => normalizeGender(g)).filter(Boolean))
  );

  if (normalized.length === 0) return null;

  const variants = normalized.flatMap((gender) => [
    gender,
    `${gender.charAt(0).toUpperCase()}${gender.slice(1)}`,
  ]);

  return { gender: { in: variants } };
}

export function canAccessGender(allowedGenders, targetGender) {
  if (!allowedGenders) return true;
  const normalizedTarget = normalizeGender(targetGender);
  if (!normalizedTarget) return false;
  return allowedGenders.includes(normalizedTarget);
}
