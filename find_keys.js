import fs from "fs";
const lines = fs.readFileSync("src/App.tsx", "utf-8").split("\n");
lines.forEach((line, i) => {
  if (i + 1 >= 7100 && i + 1 <= 10000 && line.includes("key=")) {
    console.log(`${i + 1}: ${line}`);
  }
});
