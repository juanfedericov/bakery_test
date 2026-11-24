CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

CREATE TYPE "ScheduleDeliveryMethod" AS ENUM ('pickup', 'delivery');

CREATE TABLE "WeeklyScheduleRule" (
    "id" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "deliveryMethod" "ScheduleDeliveryMethod" NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "opensAt" TIME(0) NOT NULL,
    "closesAt" TIME(0) NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScheduleRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeeklyScheduleRule_slotIntervalMinutes_check" CHECK ("slotIntervalMinutes" > 0)
);

CREATE UNIQUE INDEX "WeeklyScheduleRule_weekday_deliveryMethod_key"
ON "WeeklyScheduleRule"("weekday", "deliveryMethod");

CREATE TABLE "ScheduleException" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "deliveryMethod" "ScheduleDeliveryMethod" NOT NULL,
    "isClosed" BOOLEAN NOT NULL,
    "opensAt" TIME(0),
    "closesAt" TIME(0),
    "slotIntervalMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScheduleException_schedule_check" CHECK (
        ("isClosed" AND "opensAt" IS NULL AND "closesAt" IS NULL AND "slotIntervalMinutes" IS NULL)
        OR
        (NOT "isClosed" AND "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "slotIntervalMinutes" IS NOT NULL AND "slotIntervalMinutes" > 0)
    )
);

CREATE UNIQUE INDEX "ScheduleException_date_deliveryMethod_key"
ON "ScheduleException"("date", "deliveryMethod");
