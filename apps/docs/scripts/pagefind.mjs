import { createIndex } from "pagefind";

const { index, errors: createErrors } = await createIndex();
if (createErrors.length > 0) {
  console.error("pagefind createIndex errors:", createErrors);
  process.exit(1);
}

const { errors: addErrors } = await index.addDirectory({ path: "out" });
if (addErrors.length > 0) {
  console.error("pagefind addDirectory errors:", addErrors);
  process.exit(1);
}

const { errors: writeErrors } = await index.writeFiles({
  outputPath: "out/_pagefind",
});
if (writeErrors.length > 0) {
  console.error("pagefind writeFiles errors:", writeErrors);
  process.exit(1);
}

await index.deleteIndex();
console.log("Pagefind index written to out/_pagefind");
