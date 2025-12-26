import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/authz";
import { mkdir } from "fs/promises";

export async function POST(req: Request) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "Dosya bulunamadı" }, { status: 400 });
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ message: "Dosya boyutu 3MB'dan büyük olamaz" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + "_" + file.name.replaceAll(" ", "_");
    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Ensure directory exists
    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // ignore if exists
    }
    
    try {
        await writeFile(path.join(uploadDir, filename), buffer);
    } catch (err) {
        console.error("File save error", err);
        return NextResponse.json({ message: "Dosya kaydedilemedi" }, { status: 500 });
    }

    return NextResponse.json({ 
        url: `/uploads/${filename}`,
        filename: file.name,
        size: file.size,
        type: file.type
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Yükleme hatası" }, { status: 500 });
  }
}
