import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import {
  resolveAllowedGendersForUser,
  canAccessGender,
} from "@/app/lib/memberAccess";
import { assignmentRangesOverlap } from "@/app/lib/cabinetRanges";

const prisma = new PrismaClient();

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cabinetId = parseInt(id, 10);
    if (Number.isNaN(cabinetId)) {
      return NextResponse.json({ error: "Invalid cabinet id" }, { status: 400 });
    }

    const body = await request.json();
    const customerId = parseInt(body.customerId, 10);
    if (Number.isNaN(customerId)) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }

    const startDate = body.startDate ? new Date(body.startDate) : null;
    let endDate =
      body.endDate === undefined || body.endDate === null || body.endDate === ""
        ? null
        : new Date(body.endDate);

    if (!startDate || Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Valid start date is required" }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }
    if (endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
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

    const [cabinet, customer] = await Promise.all([
      prisma.cabinet.findUnique({ where: { id: cabinetId } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
    ]);

    if (!cabinet) {
      return NextResponse.json({ error: "Cabinet not found" }, { status: 404 });
    }
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (!canAccessGender(allowedGenders, customer.gender)) {
      return NextResponse.json(
        { error: "You are not allowed to assign this member" },
        { status: 403 }
      );
    }

    const existingCabinet = await prisma.cabinetAssignment.findMany({
      where: { cabinetId },
    });
    for (const row of existingCabinet) {
      if (
        assignmentRangesOverlap(startDate, endDate, row.startDate, row.endDate)
      ) {
        return NextResponse.json(
          {
            error:
              "This cabinet already has an assignment that overlaps these dates. End the current assignment first or choose different dates.",
          },
          { status: 409 }
        );
      }
    }

    const existingCustomer = await prisma.cabinetAssignment.findMany({
      where: { customerId },
    });
    for (const row of existingCustomer) {
      if (
        assignmentRangesOverlap(startDate, endDate, row.startDate, row.endDate)
      ) {
        return NextResponse.json(
          {
            error:
              "This member already has another cabinet assignment that overlaps these dates.",
          },
          { status: 409 }
        );
      }
    }

    const assignment = await prisma.cabinetAssignment.create({
      data: {
        cabinetId,
        customerId,
        startDate,
        endDate,
      },
      include: {
        cabinet: true,
        customer: {
          select: { id: true, name: true, phone: true, gender: true },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST assign:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
