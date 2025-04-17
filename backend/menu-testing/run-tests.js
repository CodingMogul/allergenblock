const fs = require("fs");
const path = require("path");
const axios = require("axios");

const MENU_FOLDER = path.join(__dirname, "test-menus");
const CSV_FILE = path.join(__dirname, "testresults.csv");
const ENDPOINT = "http://localhost:3000/api/camera/test-branch";

async function runTests() {
  const files = fs.readdirSync(MENU_FOLDER).filter(file => file.endsWith(".jpeg"));
  const csvHeader = "Restaurant,Photo Type,JSON Output\n";
  const csvRows = [];

  for (const file of files) {
    const restaurantName = file.replace(".jpeg", "");
    const url = `${ENDPOINT}?file=${file}`;
    console.log(`🧪 Testing: ${restaurantName}`);

    try {
      const res = await axios.get(url);
      const jsonStr = JSON.stringify(res.data.menuItems).replace(/"/g, '""');
      csvRows.push(`${restaurantName},"${jsonStr}"`);
    } catch (error) {
      console.error(`❌ Failed for ${file}`, error.message);
      csvRows.push(`${restaurantName},1,"ERROR"`);
    }
  }

  fs.writeFileSync(CSV_FILE, csvHeader + csvRows.join("\n"), "utf8");
  console.log("✅ Done. Results written to testresults.csv");
}

runTests();
