import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"; // TODO: Enable when database is connected
import { requireSession } from "@/lib/authz";
import * as Papa from "papaparse";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const clinicId = session.user?.clinicId || "default";
  
  // TODO: Replace with actual database queries when connected
  // const data = {
  //   patients: await prisma.patient.findMany({ where: { clinicId } }),
  //   assignments: await prisma.assignment.findMany({ where: { clinicId } }),
  //   appointments: await prisma.appointment.findMany({ where: { clinicId } }),
  //   notes: await prisma.note.findMany({ where: { clinicId } }),
  // };
  
  const data = {
    patients: [
      {
        id: "1",
        name: "Örnek Hasta",
        phone: "5551234567",
        email: "hasta@example.com",
        kvkkConsent: true,
        notes: "Demo hasta notları",
        clinicId: clinicId,
        createdAt: new Date().toISOString()
      }
    ],
    assignments: [
      {
        id: "1",
        clinicId: clinicId,
        patientId: "1",
        specialistId: "uzman-1",
        feeId: "fee-1",
        status: "active",
        createdAt: new Date().toISOString()
      }
    ],
    appointments: [
      {
        id: "1",
        clinicId: clinicId,
        assignmentId: "1",
        startAt: new Date().toISOString(),
        durationMin: 50,
        feeFinal: 150000,
        splitClinic: 50,
        splitDoctor: 50,
        createdAt: new Date().toISOString()
      }
    ],
    notes: [
      {
        id: "1",
        clinicId: clinicId,
        assignmentId: "1",
        authorId: session.user?.id || "demo-author",
        content: "Örnek not içeriği",
        visibility: "PRIVATE",
        createdAt: new Date().toISOString()
      }
    ]
  };

  if (format === "json") {
    return NextResponse.json(data);
  }

  if (format === "csv") {
    const csv = Papa.unparse(data.patients);
    return new NextResponse(csv, {
      headers: { 
        "Content-Type": "text/csv", 
        "Content-Disposition": "attachment; filename=hastalar_export.csv" 
      },
    });
  }

  if (format === "excel") {
    const wb = new ExcelJS.Workbook();
    Object.entries(data).forEach(([key, arr]) => {
      const sheet = wb.addWorksheet(key);
      if (arr.length > 0) {
        sheet.columns = Object.keys(arr[0]).map((c) => ({ header: c, key: c }));
        arr.forEach((r) => sheet.addRow(r));
      }
    });
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=klinik_export.xlsx",
      },
    });
  }

  if (format === "sql") {
    const inserts = Object.entries(data)
      .map(([key, arr]) =>
        arr.map((row) => {
          const values = Object.values(row).map(v => 
            typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : 
            v === null ? "NULL" :
            typeof v === "boolean" ? (v ? "TRUE" : "FALSE") :
            v
          ).join(",");
          return `INSERT INTO ${key} (${Object.keys(row).join(",")}) VALUES (${values});`;
        }).join("\\n")
      )
      .join("\\n");
    return new NextResponse(inserts, {
      headers: { 
        "Content-Type": "text/plain", 
        "Content-Disposition": "attachment; filename=klinik_export.sql" 
      },
    });
  }

  return NextResponse.json({ error: "Desteklenmeyen format" }, { status: 400 });
}