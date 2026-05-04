import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";
import { assignmentCoversPaymentDate } from "@/app/lib/cabinetAssignmentEligible";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const rows = await prisma.cabinetPayment.findMany({
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

    const filtered = rows.filter((r) =>
      canAccessGender(allowedGenders, r.assignment.customer.gender)
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("GET cabinet-payments:", error);
    return NextResponse.json(
      { error: "Failed to load cabinet payments" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const assignmentId = parseInt(body.assignmentId, 10);
    const paidAmount = parseFloat(body.paidAmount);
    const discount = parseFloat(body.discount ?? 0);
    const balance = parseFloat(body.balance);

    if (Number.isNaN(assignmentId)) {
      return NextResponse.json(
        { error: "Assignment is required" },
        { status: 400 }
      );
    }
    if (Number.isNaN(paidAmount) || Number.isNaN(balance)) {
      return NextResponse.json(
        { error: "Amount and balance are required" },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const assignment = await prisma.cabinetAssignment.findUnique({
      where: { id: assignmentId },
      include: { customer: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (!canAccessGender(allowedGenders, assignment.customer.gender)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paymentDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }
    if (!assignmentCoversPaymentDate(assignment, paymentDate)) {
      return NextResponse.json(
        {
          error:
            "This rental has ended — you cannot record a cabinet payment for this period.",
        },
        { status: 400 }
      );
    }

    const payment = await prisma.cabinetPayment.create({
      data: {
        assignmentId,
        userId,
        paidAmount,
        discount: Number.isNaN(discount) ? 0 : discount,
        balance,
        date: paymentDate,
      },
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
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST cabinet-payments:", error);
    return NextResponse.json(
      { error: "Failed to record cabinet payment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
