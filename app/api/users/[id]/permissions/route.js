import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get effective permissions for a user (based on their role)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find role by name (User.role stores role name)
    const role = await prisma.role.findFirst({
      where: { name: user.role },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    const permissions = role?.permissions?.map((rp) => rp.permission) || [];
    return NextResponse.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      memberAccess: user.memberAccess || "both",
      permissions,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 }
    );
  }
}

// Update user's role (which determines their permissions)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { role, memberAccess } = body;
    const normalizedMemberAccess = (memberAccess || "both").toString().toLowerCase();

    if (!role?.trim()) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }
    if (!["male", "female", "both"].includes(normalizedMemberAccess)) {
      return NextResponse.json(
        { error: "Member access must be male, female, or both" },
        { status: 400 }
      );
    }

    const roleExists = await prisma.role.findFirst({
      where: { name: role.trim() },
    });
    if (!roleExists) {
      return NextResponse.json(
        { error: "Role does not exist" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role.trim(), memberAccess: normalizedMemberAccess },
    });

    const updatedRole = await prisma.role.findFirst({
      where: { name: user.role },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      memberAccess: user.memberAccess || "both",
      permissions: updatedRole?.permissions?.map((rp) => rp.permission) || [],
    });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return NextResponse.json(
      { error: "Failed to update user permissions" },
      { status: 500 }
    );
  }
}
