import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const paymentId = parseInt(id, 10);
    if (Number.isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const payment = await prisma.cabinetPayment.findUnique({
      where: { id: paymentId },
      include: {
        assignment: {
          include: { customer: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (!canAccessGender(allowedGenders, payment.assignment.customer.gender)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.cabinetPayment.delete({ where: { id: paymentId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE cabinet-payment:", error);
    return NextResponse.json(
      { error: "Failed to delete cabinet payment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
