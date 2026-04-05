import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, role, password, memberAccess } = body;
    const normalizedMemberAccess = (memberAccess || "both").toString().toLowerCase();

    // Validation
    if (!username || !role || !password) {
      return NextResponse.json(
        { error: "Username, role, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }
    if (!["male", "female", "both"].includes(normalizedMemberAccess)) {
      return NextResponse.json(
        { error: "Member access must be male, female, or both." },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (without image field)
    const newUser = await prisma.user.create({
      data: {
        username,
        role,
        memberAccess: normalizedMemberAccess,
        password: hashedPassword,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username already exists." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Internal server error. Please check if database is properly synced.",
      },
      { status: 500 }
    );
  }
}
