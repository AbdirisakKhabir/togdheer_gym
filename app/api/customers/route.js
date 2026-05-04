// app/api/customers/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { buildGenderAccessWhere, resolveAllowedGendersForUser } from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    const accessWhere = buildGenderAccessWhere(allowedGenders);
    if (accessWhere === null) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const shift = searchParams.get("shift");
    const type = searchParams.get("type");
    const expireDate = searchParams.get("expireDate");
    /** When "1", skip the default "active members only" filter (e.g. locker / cabinet pickers). */
    const bypassDefault = searchParams.get("bypassDefault") === "1";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "200");
    const skip = (page - 1) * limit;

    if (gender && gender !== "all" && allowedGenders) {
      const normalizedGender = gender.toLowerCase();
      if (!allowedGenders.includes(normalizedGender)) {
        return NextResponse.json({
          customers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }
    }

    // Build where clause for filtering
    let where = {};

    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle stats type filtering (has priority)
    if (type) {
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);

      switch (type) {
        case "active":
          // Active members with future expire dates
          where.isActive = true;
          where.expireDate = { gte: today };
          break;
        case "noExpireDate":
          // All members that have no expiration date (expireDate is null)
          where = {
            expireDate: null,
          };
          break;
        case "expired":
          where = {
            OR: [{ expireDate: { lt: today } }, { isActive: false }],
          };
          break;
        case "expiring":
          where = {
            isActive: true,
            expireDate: {
              gte: today,
              lte: nextWeek,
            },
          };
          break;
        default:
          // If unknown type, don't apply any filters (show all)
          break;
      }
    }
    // Handle regular filtering (when no type parameter)
    else {
      // Apply default filter ONLY when no search and no specific status
      if (
        !bypassDefault &&
        !search &&
        (!status || status === "all")
      ) {
        // DEFAULT: Show only active members (isActive = true AND expireDate >= today)
        where.isActive = true;
        where.expireDate = { gte: today };
      }

      // Search filter - should search through ALL members
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
            },
          },
          {
            phone: {
              contains: search,
            },
          },
        ];
      }

      // Status filter
      if (status && status !== "all") {
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        switch (status) {
          case "active":
            where.isActive = true;
            where.expireDate = { gte: today };
            break;
          case "noExpireDate":
            where.expireDate = null;
            break;
          case "expired":
            where = {
              OR: [{ expireDate: { lt: today } }, { isActive: false }],
            };
            break;
          case "expiring":
            where.isActive = true;
            where.expireDate = {
              gte: today,
              lte: nextWeek,
            };
            break;
          default:
            break;
        }
      }

      // Add gender filter
      if (gender && gender !== "all") {
        where.gender = gender;
      }

      // Add shift filter
      if (shift && shift !== "all") {
        where.shift = shift;
      }

      // Handle specific expire date filter
      if (expireDate) {
        where.expireDate = expireDate;
      }
    }

    if (Object.keys(accessWhere).length > 0) {
      where = Object.keys(where).length > 0 ? { AND: [where, accessWhere] } : accessWhere;
    }

    // Get customers with pagination
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          image: true,
          registerDate: true,
          expireDate: true,
          fee: true,
          isActive: true,
          gender: true,
          balance: true,
          height: true,
          weight: true,
          bmi: true,
          standardWeight: true,
          shift: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: { registerDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch customers",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
