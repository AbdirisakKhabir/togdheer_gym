import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

/** End a cabinet assignment (frees the box after this date). */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assignmentId = parseInt(id, 10);
    if (Number.isNaN(assignmentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date();

    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }

    const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    const existing = await prisma.cabinetAssignment.findUnique({
      where: { id: assignmentId },
      include: { customer: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (!canAccessGender(allowedGenders, existing.customer.gender)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const start = new Date(existing.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < start) {
      return NextResponse.json(
        { error: "End date cannot be before the assignment start date" },
        { status: 400 }
      );
    }

    const updated = await prisma.cabinetAssignment.update({
      where: { id: assignmentId },
      data: { endDate },
      include: {
        cabinet: true,
        customer: {
          select: { id: true, name: true, phone: true, gender: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH cabinet-assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
