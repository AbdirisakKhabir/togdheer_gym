import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cabinetId = parseInt(id, 10);
    if (Number.isNaN(cabinetId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const code = body.code != null ? String(body.code).trim() : undefined;
    const monthlyPrice =
      body.monthlyPrice != null ? parseFloat(body.monthlyPrice) : undefined;
    const notes =
      body.notes === "" || body.notes == null
        ? null
        : String(body.notes).trim();

    const data = {};
    if (code !== undefined) data.code = code;
    if (monthlyPrice !== undefined && !Number.isNaN(monthlyPrice) && monthlyPrice >= 0)
      data.monthlyPrice = monthlyPrice;
    if (body.notes !== undefined) data.notes = notes || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.cabinet.update({
      where: { id: cabinetId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/cabinets/[id]:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Cabinet not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A cabinet with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update cabinet" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cabinetId = parseInt(id, 10);
    if (Number.isNaN(cabinetId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const count = await prisma.cabinetAssignment.count({
      where: { cabinetId },
    });
    if (count > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this cabinet because it has assignment history. Remove or end assignments first.",
        },
        { status: 409 }
      );
    }

    await prisma.cabinet.delete({ where: { id: cabinetId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/cabinets/[id]:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Cabinet not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete cabinet" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
