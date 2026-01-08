import puppeteer from "puppeteer";
import { google } from "googleapis";

const SHEET_ID = "1wnMfIIqaukOiZLgFX4rb3zBr0dUS-clLV7hpfTlU40E";
const RANGE = "Sheet1!A2:F";

const BASE_ID = 13720 - 42; // roll 42 → id 13720

async function run() {
  // 1. Launch real Chrome (NOT headless)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // 2. Open login page
  await page.goto("https://aims.iith.ac.in/aims/login", {
    waitUntil: "networkidle2",
  });

  console.log("➡️  Login manually, then press ENTER here");
  await new Promise((resolve) => process.stdin.once("data", resolve));

  // 3. Google Sheets auth
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // 4. Loop rolls
  for (let rollNo = 1; rollNo <= 59; rollNo++) {
    const studentId = BASE_ID + rollNo;

    try {
      const data = await page.evaluate(async (studentId) => {
        const res = await fetch(
          `https://aims.iith.ac.in/aims/courseReg/getPeriodWiseCGPASGPA/${studentId}`,
          {
            method: "POST",
            headers: {
              "x-requested-with": "XMLHttpRequest",
            },
            credentials: "include",
          }
        );
        return res.json();
      }, studentId);

      // filter + sort semesters
      const valid = data
        .filter((d) => d.sgpa !== "-" && d.cgpa !== "-")
        .sort((a, b) => a.periodId - b.periodId);

      const sem1 = valid[0]?.sgpa ?? "";
      const sem2 = valid[1]?.sgpa ?? "";
      const sem3 = valid[2]?.sgpa ?? "";
      const cgpa = valid.at(-1)?.cgpa ?? "";

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RANGE,
        valueInputOption: "RAW",
        requestBody: {
          values: [["", rollNo, sem1, sem2, sem3, cgpa]],
        },
      });

      console.log(`✔ Roll ${rollNo} written`);
    } catch (err) {
      console.error(`❌ Roll ${rollNo} failed`, err.message);
    }

    // polite delay
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("Done");
}

run();
