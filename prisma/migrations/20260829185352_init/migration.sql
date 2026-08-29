-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputMethod" TEXT NOT NULL,
    "rawInput" TEXT,
    "receiptImage" TEXT,
    "confidence" REAL,
    "locationName" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "tax" REAL,
    "tip" REAL
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" REAL,
    "amount" REAL NOT NULL,
    "expenseId" TEXT NOT NULL,
    CONSTRAINT "ReceiptItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
