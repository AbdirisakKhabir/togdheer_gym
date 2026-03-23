import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { buildGenderAccessWhere, resolveAllowedGenders } from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedGenders = await resolveAllowedGenders(prisma, session.user.role);
    const accessWhere = buildGenderAccessWhere(allowedGenders);
    if (accessWhere === null) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastOfMonth.setHours(23, 59, 59, 999);

    const mergeWhere = (where = {}) => {
      if (!accessWhere || Object.keys(accessWhere).length === 0) return where;
      return Object.keys(where).length > 0 ? { AND: [where, accessWhere] } : accessWhere;
    };

    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      expiringSoon,
      noExpireDate,
      monthlyPayments,
      monthlyExpenses,
      totalBalances,
    ] = await Promise.all([
      prisma.customer.count({ where: mergeWhere({}) }),
      prisma.customer.count({
        where: mergeWhere({
          isActive: true,
          expireDate: { gte: today },
        }),
      }),
      prisma.customer.count({
        where: mergeWhere({
          OR: [{ expireDate: { lt: today } }, { isActive: false }],
        }),
      }),
      prisma.customer.count({
        where: mergeWhere({
          expireDate: { gte: today, lte: nextWeek },
        }),
      }),
      prisma.customer.count({ where: mergeWhere({ expireDate: null }) }),
      prisma.payment.aggregate({
        where: {
          date: { gte: firstOfMonth, lte: lastOfMonth },
        },
        _sum: { paidAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          date: { gte: firstOfMonth, lte: lastOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.customer.aggregate({
        where: mergeWhere({}),
        _sum: { balance: true },
      }),
    ]);

    const revenue = monthlyPayments._sum.paidAmount ?? 0;
    const expenses = monthlyExpenses._sum.amount ?? 0;
    const netIncome = revenue - expenses;
    const totalBalancesAmount = totalBalances._sum.balance ?? 0;

    return NextResponse.json({
      members: {
        total: totalMembers,
        active: activeMembers,
        expired: expiredMembers,
        expiringSoon,
        noExpireDate,
      },
      financials: {
        revenue,
        expenses,
        netIncome,
        totalBalances: totalBalancesAmount,
      },
      period: {
        month: today.toLocaleString("default", { month: "long" }),
        year: today.getFullYear(),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
