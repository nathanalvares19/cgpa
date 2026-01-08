import { google } from "googleapis";

const SHEET_ID = "1wnMfIIqaukOiZLgFX4rb3zBr0dUS-clLV7hpfTlU40E";
const RANGE = "Sheet1!A2:F";

// Given: roll 42 -> studentId 13720
const BASE_ID = 13720 - 42; // 13678

async function run() {
  // Google Sheets auth
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  for (let rollNo = 1; rollNo <= 59; rollNo++) {
    const studentId = BASE_ID + rollNo;

    try {
      const res = await fetch(
        `https://aims.iith.ac.in/aims/courseReg/getPeriodWiseCGPASGPA/${studentId}`,
        {
          method: "POST",
          headers: {
            accept: "*/*",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
          },
          credentials: "include",
        }
      );

      if (!res.ok) {
        console.error(`HTTP error for roll ${rollNo}`);
        continue;
      }

      // const data = await res.json();
      const text = await res.text();

      if (!text.trim().startsWith("[")) {
        console.error(`HTML response for roll ${rollNo}, skipping`);
        continue;
      }

      const data = JSON.parse(text);

      // Filter valid semesters and sort oldest → newest
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
      console.error(`❌ Error for roll ${rollNo}:`, err.message);
    }
  }

  console.log("All done");
}

run();
