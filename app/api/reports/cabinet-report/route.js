import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, cabinetCode } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const trimmedCode =
      cabinetCode && String(cabinetCode).trim() !== ""
        ? String(cabinetCode).trim()
        : null;

    const whereClause = {
      date: { gte: start, lte: end },
      ...(trimmedCode
        ? {
            assignment: {
              cabinet: { code: { contains: trimmedCode } },
            },
          }
        : {}),
    };

    const rawPayments = await prisma.cabinetPayment.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            cabinet: { select: { id: true, code: true, monthlyPrice: true } },
            customer: {
              select: { id: true, name: true, phone: true, gender: true },
            },
          },
        },
        user: { select: { id: true, username: true } },
      },
      orderBy: { date: "desc" },
    });

    const payments = rawPayments.filter((p) =>
      canAccessGender(allowedGenders, p.assignment.customer.gender)
    );

    const totals = {
      totalPaid: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      totalDiscount: payments.reduce((sum, p) => sum + p.discount, 0),
      totalRecordedBalance: payments.reduce((sum, p) => sum + p.balance, 0),
      paymentCount: payments.length,
    };

    const allCabinets = await prisma.cabinet.findMany({
      include: {
        assignments: {
          select: { id: true, startDate: true, endDate: true },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let occupied = 0;
    for (const c of allCabinets) {
      const active = c.assignments.find((a) => {
        const s = new Date(a.startDate);
        s.setHours(0, 0, 0, 0);
        if (s > today) return false;
        if (!a.endDate) return true;
        const e = new Date(a.endDate);
        e.setHours(0, 0, 0, 0);
        return e >= today;
      });
      if (active) occupied++;
    }

    const cabinetOverview = {
      totalCabinets: allCabinets.length,
      occupied,
      available: allCabinets.length - occupied,
    };

    return NextResponse.json({
      payments,
      totals,
      cabinetOverview,
      period: { startDate: startDate, endDate: endDate },
    });
  } catch (error) {
    console.error("cabinet-report:", error);
    return NextResponse.json(
      { error: "Failed to generate cabinet report" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
