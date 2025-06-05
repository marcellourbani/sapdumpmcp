import { readFileSync } from "fs"
import { parseDump, parsexmlDump } from "./dumpparser.ts"

test("parse xml dump", () => {
  const raw = readFileSync("examples/dump1.xml", "utf-8")
  const parsed = parsexmlDump(raw)
  expect(parsed.links[0].uri).toBe(
    "/sap/bc/adt/runtime/dump/20250603232106vhcala4hci_A4H_00               DEVELOPER   001        6/formatted"
  )
  expect(parsed.chapters[0].title).toBe("System environment")
  expect(parsed.error).toBe("OBJECTS_OBJREF_NOT_ASSIGNED")
})

test("parse xml dump with empty links", () => {
  const xml = readFileSync("examples/dump1.xml", "utf-8")
  const text = readFileSync("examples/dump1_summary.txt", "utf-8")
  const parsed = parseDump(xml, text)
  expect(parsed.chapters[0].lines[0].trim()).toBe("System environment")
})
