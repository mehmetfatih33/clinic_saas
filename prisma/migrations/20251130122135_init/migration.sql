-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ASISTAN', 'UZMAN', 'PERSONEL');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PHQ9', 'GAD7');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PLANNED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('SPECIALIST', 'STAFF');

-- CreateEnum
CREATE TYPE "PayoutCategory" AS ENUM ('SALARY', 'BONUS', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('CASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PLANNED', 'PAID');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashTransactionCategory" AS ENUM ('HASTA_ODEME', 'UZMAN_ODEME', 'MAAS', 'KIRA', 'DIGER_GIDER', 'DIGER_GELIR');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workSchedule" JSONB,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ASISTAN',
    "passwordHash" TEXT,
    "clinicId" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistProfile" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branch" TEXT,
    "bio" TEXT,
    "defaultShare" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "hourlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPatients" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SpecialistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistTimeOff" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialistTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "reference" TEXT,
    "fee" DOUBLE PRECISION,
    "assignedToId" TEXT,
    "specialistShare" DOUBLE PRECISION,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalPayments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistFee" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "customAmount" INTEGER,
    "splitClinic" INTEGER,
    "splitDoctor" INTEGER,

    CONSTRAINT "SpecialistFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "feeId" TEXT,
    "customAmount" INTEGER,
    "splitClinic" INTEGER,
    "splitDoctor" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "roomId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "answers" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "specialistCut" DOUBLE PRECISION NOT NULL,
    "clinicCut" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "specialistId" TEXT,
    "type" "PlanType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPlan" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "specialistId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "type" "PayoutType" NOT NULL,
    "category" "PayoutCategory",
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodMonth" INTEGER,
    "periodYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceAccountType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "accountId" TEXT,
    "categoryId" TEXT,
    "staffId" TEXT,
    "patientId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PLANNED',
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "category" "CashTransactionCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentId" TEXT,
    "patientId" TEXT,
    "specialistId" TEXT,
    "cashCategoryId" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialistProfile_userId_key" ON "SpecialistProfile"("userId");

-- CreateIndex
CREATE INDEX "SpecialistProfile_clinicId_idx" ON "SpecialistProfile"("clinicId");

-- CreateIndex
CREATE INDEX "SpecialistTimeOff_clinicId_idx" ON "SpecialistTimeOff"("clinicId");

-- CreateIndex
CREATE INDEX "SpecialistTimeOff_specialistId_idx" ON "SpecialistTimeOff"("specialistId");

-- CreateIndex
CREATE INDEX "SpecialistTimeOff_start_end_idx" ON "SpecialistTimeOff"("start", "end");

-- CreateIndex
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "FeeSchedule_clinicId_idx" ON "FeeSchedule"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSchedule_clinicId_title_key" ON "FeeSchedule"("clinicId", "title");

-- CreateIndex
CREATE INDEX "SpecialistFee_clinicId_idx" ON "SpecialistFee"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialistFee_specialistId_feeId_key" ON "SpecialistFee"("specialistId", "feeId");

-- CreateIndex
CREATE INDEX "Assignment_clinicId_idx" ON "Assignment"("clinicId");

-- CreateIndex
CREATE INDEX "Assignment_patientId_idx" ON "Assignment"("patientId");

-- CreateIndex
CREATE INDEX "Assignment_specialistId_idx" ON "Assignment"("specialistId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_idx" ON "Appointment"("clinicId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_specialistId_idx" ON "Appointment"("specialistId");

-- CreateIndex
CREATE INDEX "Appointment_roomId_idx" ON "Appointment"("roomId");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "Appointment"("date");

-- CreateIndex
CREATE INDEX "Room_clinicId_idx" ON "Room"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_clinicId_name_key" ON "Room"("clinicId", "name");

-- CreateIndex
CREATE INDEX "Note_clinicId_idx" ON "Note"("clinicId");

-- CreateIndex
CREATE INDEX "Note_patientId_idx" ON "Note"("patientId");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_idx" ON "AuditLog"("clinicId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Assessment_clinicId_idx" ON "Assessment"("clinicId");

-- CreateIndex
CREATE INDEX "Assessment_patientId_idx" ON "Assessment"("patientId");

-- CreateIndex
CREATE INDEX "Assessment_specialistId_idx" ON "Assessment"("specialistId");

-- CreateIndex
CREATE INDEX "Assessment_createdAt_idx" ON "Assessment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_patientId_idx" ON "Payment"("patientId");

-- CreateIndex
CREATE INDEX "Payment_specialistId_idx" ON "Payment"("specialistId");

-- CreateIndex
CREATE INDEX "Payment_clinicId_idx" ON "Payment"("clinicId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentPlan_clinicId_idx" ON "PaymentPlan"("clinicId");

-- CreateIndex
CREATE INDEX "PaymentPlan_patientId_idx" ON "PaymentPlan"("patientId");

-- CreateIndex
CREATE INDEX "PaymentPlan_specialistId_idx" ON "PaymentPlan"("specialistId");

-- CreateIndex
CREATE INDEX "PaymentPlan_dueDate_idx" ON "PaymentPlan"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX "ClinicPlan_clinicId_idx" ON "ClinicPlan"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPlan_planId_idx" ON "ClinicPlan"("planId");

-- CreateIndex
CREATE INDEX "ClinicPlan_isActive_idx" ON "ClinicPlan"("isActive");

-- CreateIndex
CREATE INDEX "Transaction_clinicId_idx" ON "Transaction"("clinicId");

-- CreateIndex
CREATE INDEX "Transaction_patientId_idx" ON "Transaction"("patientId");

-- CreateIndex
CREATE INDEX "Transaction_specialistId_idx" ON "Transaction"("specialistId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Payout_clinicId_idx" ON "Payout"("clinicId");

-- CreateIndex
CREATE INDEX "Payout_targetUserId_idx" ON "Payout"("targetUserId");

-- CreateIndex
CREATE INDEX "Payout_type_idx" ON "Payout"("type");

-- CreateIndex
CREATE INDEX "Payout_periodYear_periodMonth_idx" ON "Payout"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "FinanceAccount_clinicId_idx" ON "FinanceAccount"("clinicId");

-- CreateIndex
CREATE INDEX "FinanceCategory_clinicId_idx" ON "FinanceCategory"("clinicId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_clinicId_idx" ON "FinanceTransaction"("clinicId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_date_idx" ON "FinanceTransaction"("date");

-- CreateIndex
CREATE INDEX "FinanceTransaction_type_idx" ON "FinanceTransaction"("type");

-- CreateIndex
CREATE INDEX "PayrollEntry_clinicId_idx" ON "PayrollEntry"("clinicId");

-- CreateIndex
CREATE INDEX "PayrollEntry_staffId_idx" ON "PayrollEntry"("staffId");

-- CreateIndex
CREATE INDEX "CashTransaction_clinicId_idx" ON "CashTransaction"("clinicId");

-- CreateIndex
CREATE INDEX "CashTransaction_date_idx" ON "CashTransaction"("date");

-- CreateIndex
CREATE INDEX "CashTransaction_type_idx" ON "CashTransaction"("type");

-- CreateIndex
CREATE INDEX "CashTransaction_category_idx" ON "CashTransaction"("category");

-- CreateIndex
CREATE INDEX "CashTransaction_cashCategoryId_idx" ON "CashTransaction"("cashCategoryId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistProfile" ADD CONSTRAINT "SpecialistProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistProfile" ADD CONSTRAINT "SpecialistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistTimeOff" ADD CONSTRAINT "SpecialistTimeOff_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistTimeOff" ADD CONSTRAINT "SpecialistTimeOff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistFee" ADD CONSTRAINT "SpecialistFee_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "FeeSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistFee" ADD CONSTRAINT "SpecialistFee_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "SpecialistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistFee" ADD CONSTRAINT "SpecialistFee_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "FeeSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPlan" ADD CONSTRAINT "ClinicPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPlan" ADD CONSTRAINT "ClinicPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinanceTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_cashCategoryId_fkey" FOREIGN KEY ("cashCategoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
