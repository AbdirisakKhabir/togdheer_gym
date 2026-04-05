// /api/customers/stats/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { buildGenderAccessWhere, resolveAllowedGendersForUser } from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

export async function GET() {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    const mergeWhere = (where = {}) => {
      if (!accessWhere || Object.keys(accessWhere).length === 0) return where;
      return Object.keys(where).length > 0 ? { AND: [where, accessWhere] } : accessWhere;
    };

    const [total, active, noExpireDate, expired, expiring] = await Promise.all([
      // Total members
      prisma.customer.count({ where: mergeWhere({}) }),
      
      // Active members (isActive = true AND expireDate >= today)
      prisma.customer.count({
        where: mergeWhere({
          isActive: true,
          expireDate: { gte: today }
        })
      }),
      
      // No expire date members (expireDate is null)
      prisma.customer.count({
        where: mergeWhere({
          expireDate: null
        })
      }),
      
      // Expired members (expireDate < today OR isActive = false)
      prisma.customer.count({
        where: mergeWhere({
          OR: [
            { expireDate: { lt: today } },
            { isActive: false }
          ]
        })
      }),
      
      // Expiring soon (expireDate between today and next week)
      prisma.customer.count({
        where: mergeWhere({
          expireDate: {
            gte: today,
            lte: nextWeek
          }
        })
      })
    ]);

    return NextResponse.json({
      active,
      noExpireDate,
      expired,
      expiringThisWeek: expiring,
      total
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch stats',
  
    }, { status: 500 });
  }
}