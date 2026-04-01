-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "grades" TEXT,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateId_key" ON "certificates"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_email_course_template_key" ON "certificates"("email", "course", "template");
