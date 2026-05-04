import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cabinets = await prisma.cabinet.findMany({
      orderBy: { code: "asc" },
      include: {
        assignments: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, gender: true },
            },
          },
          orderBy: { startDate: "desc" },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = cabinets.map((c) => {
      const { assignments, ...rest } = c;
      const active = assignments.find((a) => {
        const s = new Date(a.startDate);
        s.setHours(0, 0, 0, 0);
        if (s > today) return false;
        if (!a.endDate) return true;
        const e = new Date(a.endDate);
        e.setHours(0, 0, 0, 0);
        return e >= today;
      });

      return {
        ...rest,
        activeAssignment: active || null,
        assignmentCount: assignments.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/cabinets:", error);
    return NextResponse.json(
      { error: "Failed to load cabinets" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const code = (body.code || "").trim();
    const monthlyPrice = parseFloat(body.monthlyPrice);
    const notes =
      body.notes && String(body.notes).trim() !== ""
        ? String(body.notes).trim()
        : null;

    if (!code) {
      return NextResponse.json({ error: "Cabinet code is required" }, { status: 400 });
    }
    if (Number.isNaN(monthlyPrice) || monthlyPrice < 0) {
      return NextResponse.json(
        { error: "Valid monthly price is required" },
        { status: 400 }
      );
    }

    const cabinet = await prisma.cabinet.create({
      data: { code, monthlyPrice, notes },
    });

    return NextResponse.json(cabinet, { status: 201 });
  } catch (error) {
    console.error("POST /api/cabinets:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A cabinet with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create cabinet" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
