-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "beruf" TEXT NOT NULL,
    "schwierigkeit" TEXT NOT NULL,
    "modus" TEXT NOT NULL,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ergebnis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "frageId" TEXT NOT NULL,
    "frageText" TEXT NOT NULL,
    "abdeckung" REAL NOT NULL,
    "auswertbar" BOOLEAN NOT NULL,
    "kopfausrichtungProzent" REAL,
    "haltungGradMedian" REAL,
    "haltungVerlauf" REAL,
    "bewegungsruhe" REAL,
    CONSTRAINT "Ergebnis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");
