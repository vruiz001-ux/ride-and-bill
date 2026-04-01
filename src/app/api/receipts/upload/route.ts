import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserEntitlements, checkCanUpload, resolveUserWorkspace } from '@/lib/services/entitlements';
import { detectVendor, detectVendorFromFilename } from '@/lib/parsers/detect';
import { generateId } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlements = await getUserEntitlements(session.user.id);
  const uploadError = checkCanUpload(entitlements);
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message, code: uploadError.code }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}. Accepted: PDF, PNG, JPG` }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');

  // Compute hash for dedup
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Check for duplicate file
  const existingFile = await prisma.receiptFile.findFirst({
    where: { hash, receipt: { userId: session.user.id } },
  });
  if (existingFile) {
    return NextResponse.json({ error: 'This file has already been uploaded.', duplicate: true }, { status: 409 });
  }

  // Try to detect vendor from filename and file content
  const textContent = file.type === 'application/pdf' ? '' : ''; // PDF text extraction would need a library
  const filenameDetection = detectVendorFromFilename(file.name);
  const contentDetection = detectVendor(textContent);

  const detectedProvider = contentDetection.provider || filenameDetection.provider || 'uber';
  const confidence = Math.max(contentDetection.confidence, filenameDetection.confidence, 0);

  const workspaceId = entitlements.workspaceId;
  const uploadId = generateId();
  const now = new Date();

  // Create receipt with "review" status — user fills in details manually
  const receipt = await prisma.receipt.create({
    data: {
      userId: session.user.id,
      workspaceId,
      provider: detectedProvider,
      sourceEmailAccountId: 'manual-upload',
      sourceMessageId: `upload-${hash}-${uploadId}`,
      tripDate: now,
      country: 'Unknown',
      countryCode: 'XX',
      city: 'Unknown',
      amountTotal: 0,
      currency: 'EUR',
      rawEmailSubject: `Manual upload: ${file.name}`,
      rawEmailSender: session.user.email || 'manual',
      parserVersion: 'upload-v1',
      parsingConfidence: confidence,
      status: 'review',
      originalAmount: 0,
      originalCurrency: 'EUR',
      conversionStatus: 'pending',
    },
  });

  // Store the file
  await prisma.receiptFile.create({
    data: {
      receiptId: receipt.id,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      hash,
      data: base64Data,
      source: 'manual_upload',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId,
      action: 'receipt.uploaded',
      entityType: 'receipt',
      entityId: receipt.id,
      details: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
    },
  });

  return NextResponse.json({
    receipt: {
      id: receipt.id,
      provider: detectedProvider,
      status: 'review',
      filename: file.name,
    },
    message: 'Receipt uploaded. Please review and fill in trip details.',
  });
}
