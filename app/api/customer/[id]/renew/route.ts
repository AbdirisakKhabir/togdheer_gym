import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { canAccessGender, resolveAllowedGenders } from "@/app/lib/memberAccess";

const prisma = new PrismaClient();

interface RenewRequest {
  expireDate: string;
  paidAmount: number | string;
  userId: number | string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedGenders = await resolveAllowedGenders(prisma, session.user.role);
    if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
      return NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      );
    }

    // Await the params to get the actual values
    const { id } = await params;
    const customerId = parseInt(id, 10);

    // Parse request body
    const { expireDate, paidAmount, userId }: RenewRequest = await request.json();

    // Convert to numeric values
    const numericUserId = parseInt(userId as string, 10);
    const numericPaidAmount = parseFloat(paidAmount as string);

    // Validate required fields
    if (!expireDate || isNaN(numericPaidAmount) || isNaN(numericUserId)) {
      return NextResponse.json(
        { error: "Expire date, paid amount, and user ID are required and must be valid" },
        { status: 400 }
      );
    }

    // Validate that customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    if (!canAccessGender(allowedGenders, existingCustomer.gender)) {
      return NextResponse.json(
        { error: "You are not allowed to access this member" },
        { status: 403 }
      );
    }

    // Parse expire date
    const newExpireDate = new Date(expireDate);
    if (isNaN(newExpireDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid expire date format" },
        { status: 400 }
      );
    }

    // Calculate new balance: amountDue = existingBalance + fee, newBalance = amountDue - paidAmount - discount
    const numericDiscount = 0;
    const amountDue = (existingCustomer.balance ?? 0) + existingCustomer.fee;
    const newBalance = Math.max(0, amountDue - numericPaidAmount - numericDiscount);

    // Update customer record
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        expireDate: newExpireDate,
        fee: numericPaidAmount,
        balance: newBalance,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Create new payment record (balance = customer balance after this payment)
    const payment = await prisma.payment.create({
      data: {
        customerId: customerId,
        userId: numericUserId,
        paidAmount: numericPaidAmount,
        discount: numericDiscount,
        balance: newBalance,
        date: new Date(),
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Customer renewed successfully",
      customer: updatedCustomer,
      payment: payment,
    });

  } catch (error) {
    console.error("Error renewing customer:", error);
    return NextResponse.json(
      { error: "Failed to renew customer" },
      { status: 500 }
    );
  }
}
