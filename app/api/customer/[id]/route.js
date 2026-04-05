// app/api/customer/[id]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { canAccessGender, resolveAllowedGendersForUser } from "@/app/lib/memberAccess";

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const prisma = new PrismaClient();

async function getAllowedGendersOrError() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      allowedGenders: null,
    };
  }

  const allowedGenders = await resolveAllowedGendersForUser(prisma, session.user);
  if (Array.isArray(allowedGenders) && allowedGenders.length === 0) {
    return {
      error: NextResponse.json(
        { error: "No member gender access assigned for this role" },
        { status: 403 }
      ),
      allowedGenders: null,
    };
  }

  return { error: null, allowedGenders };
}

// Helper: Upload to Cloudinary
async function uploadToCloudinary(file, resourceType = "image") {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return new Promise((resolve, reject) => {
      const { Readable } = require("stream");
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "libaax-fitness", resource_type: resourceType },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  } catch (error) {
    throw error;
  }
}

// Helper: Parse Dates
function parseDate(dateString) {
  if (!dateString) return null;
  const date = dateString.includes("T")
    ? new Date(dateString)
    : new Date(dateString + "T00:00:00.000Z");
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${dateString}`);
  return date;
}

// --- API HANDLERS ---

// GET - Fetch single customer
export async function GET(request, { params }) {
  try {
    const access = await getAllowedGendersOrError();
    if (access.error) return access.error;

    const { id } = await params; // Next.js 15 Fix: Unwrap params
    const customerId = parseInt(id);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessGender(access.allowedGenders, customer.gender)) {
      return NextResponse.json(
        { error: "You are not allowed to access this member" },
        { status: 403 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

// PUT - Update customer
export async function PUT(request, { params }) {
  try {
    const access = await getAllowedGendersOrError();
    if (access.error) return access.error;

    // 1. Unwrap the params Promise (Next.js 15 Requirement)
    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customer ID format" },
        { status: 400 }
      );
    }

    // 2. Extract FormData
    const formData = await request.formData();
    const name = formData.get("name");
    const phone = formData.get("phone");
    const registerDate = formData.get("registerDate");
    const expireDate = formData.get("expireDate");
    const fee = formData.get("fee");
    const gender = formData.get("gender");
    const image = formData.get("image");
    const height = formData.get("height");
    const weight = formData.get("weight");
    const bmi = formData.get("bmi");
    const standardWeight = formData.get("standardWeight");
    const shift = formData.get("shift");

    // 3. Check existence
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    if (!canAccessGender(access.allowedGenders, existingCustomer.gender)) {
      return NextResponse.json(
        { error: "You are not allowed to access this member" },
        { status: 403 }
      );
    }

    const targetGender = gender?.toString() || existingCustomer.gender;
    if (!canAccessGender(access.allowedGenders, targetGender)) {
      return NextResponse.json(
        { error: "You are not allowed to assign this member gender" },
        { status: 403 }
      );
    }

    // 4. Handle Image logic
    let imageUrl = existingCustomer.image;
    if (image && image instanceof File && image.size > 0) {
      imageUrl = await uploadToCloudinary(image);
    }

    // 5. Build update object
    const updateData = {
      name: name?.toString(),
      phone: phone && phone.toString().trim() !== "" ? phone.toString() : null,
      registerDate: parseDate(registerDate?.toString()),
      expireDate: expireDate ? parseDate(expireDate.toString()) : null,
      fee: parseFloat(fee?.toString() || "0"),
      gender: gender?.toString(),
      image: imageUrl,
      updatedAt: new Date(),
    };
    updateData.height = height && height.toString().trim() !== "" ? parseFloat(height.toString()) : null;
    updateData.weight = weight && weight.toString().trim() !== "" ? parseFloat(weight.toString()) : null;
    updateData.bmi = bmi && bmi.toString().trim() !== "" ? parseFloat(bmi.toString()) : null;
    updateData.standardWeight = standardWeight && standardWeight.toString().trim() !== "" ? parseFloat(standardWeight.toString()) : null;
    updateData.shift = shift && shift.toString().trim() !== "" ? shift.toString().trim() : null;

    // 6. Save to Database
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json(
      {
        error: error.code === "P2002" ? "Phone already exists" : error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Remove customer
export async function DELETE(request, { params }) {
  try {
    const access = await getAllowedGendersOrError();
    if (access.error) return access.error;

    const { id } = await params; // Next.js 15 Fix: Unwrap params
    const customerId = parseInt(id);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, gender: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessGender(access.allowedGenders, customer.gender)) {
      return NextResponse.json(
        { error: "You are not allowed to access this member" },
        { status: 403 }
      );
    }

    await prisma.customer.delete({ where: { id: customerId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
