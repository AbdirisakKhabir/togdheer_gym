import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

/**
 * Remove member from cabinet: deletes the assignment (and cascading cabinet payments for that rental).
 */
export async function DELETE(request, { params }) {
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

    await prisma.cabinetAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ message: "Assignment removed" });
  } catch (error) {
    console.error("DELETE cabinet-assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
