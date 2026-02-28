import { buildDailyDigest } from "../services/digest.service.js";

async function main() {
  const digest = await buildDailyDigest(5);

  console.log("\n================ DIGEST ================\n");
  console.log(digest);
  console.log("\n========================================\n");
}

main().catch(console.error);