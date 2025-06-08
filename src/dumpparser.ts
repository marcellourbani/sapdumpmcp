import { XMLParser } from "fast-xml-parser"
import { z } from "zod"
const xmlDump = z.object({
  title: z.string(),
  error: z.string(),
  author: z.string(),
  exception: z.string(),
  terminatedProgram: z.string(),
  serverInstance: z.string(),
  datetime: z.date(),
  systemDate: z.string(),
  systemTime: z.string(),
  chapters: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      category: z.string(),
      line: z.number(),
      chapterOrder: z.number(),
      categoryOrder: z.number()
    })
  ),
  links: z.array(
    z.object({
      relation: z.string(),
      uri: z.string(),
      contentType: z.string()
    })
  )
})

export const chapterNames = {
  kap0: "Short_Text",
  kap1: "What_happened",
  kap2: "What_can_you_do",
  kap3: "Error_analysis",
  kap4: "How_to_correct_the_error",
  kap5: "System_environment",
  kap6: "User_and_Transaction",
  kap6a: "Server-Side_Connection_Information",
  kap6b: "Client-Side_Connection_Information",
  kap6c: "AMC_Context_Information",
  kap6d: "APC_Context_Information",
  kap7: "Information_on_where_terminated",
  kap8: "Source_Code_Extract",
  kap9: "Contents_of_system_fields",
  kap10: "Chosen_Variables",
  kap11: "Active_Calls/Events",
  kap12: "Internal_notes",
  kap13: "Active_Calls_in_SAP_Kernel",
  kap14: "List_of_ABAP_programs_affected",
  kap16: "Directory_of_Application_Tables",
  kap19: "ABAP_Control_Blocks",
  kap21: "Spool_Error_Information",
  kap22: "Application_Calls",
  kap23: "Application_Information",
  kap24: "Termination_Point_Information_in_transformation",
  kap25: "Section_of_Source_Code_in_transformation_changed",
  kap26: "VMC_Java_Trace",
  kap27: "Lock_Shared_Objects",
  kap28: "Chain_of_Exception_Objects",
  kap29: "Database_Interface_Information"
} as const

const ok = <R extends Record<string, unknown>, K extends keyof R = keyof R>(
  raw: R
): K[] => Object.keys(raw) as K[]

function unionOfLiterals<T extends string | number>(constants: readonly T[]) {
  const literals = constants.map(x => z.literal(x)) as unknown as readonly [
    z.ZodLiteral<T>,
    z.ZodLiteral<T>,
    ...z.ZodLiteral<T>[]
  ]
  return z.union(literals)
}

export const chapterNameType = unionOfLiterals(
  ok(chapterNames).map(k => chapterNames[k])
)

type ChapterName = keyof typeof chapterNames

const getChapterName = (kap: string): string => {
  return chapterNames[kap as keyof typeof chapterNames] || kap
}

const xmlAttrs = (raw: Record<string, unknown>): Record<string, unknown> =>
  ok(raw)
    .filter(key => key.startsWith("@_"))
    .reduce(
      (acc: object, key: string) => ({ ...acc, [key.substring(2)]: raw[key] }),
      {}
    )

export const parsexmlDump = (xml: string) => {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    trimValues: false,
    parseAttributeValue: true,
    removeNSPrefix: true
  }).parse(xml)
  const {
    chapters: { chapter },
    links: { link }
  } = parsed.dump
  const attrs = xmlAttrs(parsed.dump)
  const links = link
    .map(xmlAttrs)
    .map((l: any) => ({ ...l, uri: decodeURIComponent(l.uri) }))
  const chapters = chapter.map(xmlAttrs)
  const dump = {
    ...attrs,
    datetime: new Date(attrs.datetime as string),
    chapters,
    links
  }
  return xmlDump.parse(dump)
}

const splitLines = (
  text: string,
  starts: number[]
): Record<number, string[]> => {
  starts = starts.sort((a, b) => a - b)
  const lines = text
    .replaceAll(/\r/g, "")
    .split("\n")
    .map(line => line.replace(/^\|(.*)\|$/, "$1"))
  const ranges = starts
    .map((start, index): [number, number] => [
      start,
      starts[index + 1] ? starts[index + 1] - 1 : lines.length + 1
    ])
    .map(([start, end]) => [start, lines.slice(start - 1, end)] as const)
  return ranges.reduce((acc, [start, ls]) => ({ ...acc, [start]: ls }), {})
}

type Chapter = {
  name: string
  title: string
  category: string
  text: string
}

const joinSplitLines = (lines: string[]) => {
  const res: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    while (line.match(/\\$/) && lines[i + 1]?.match(/^[^\s]/)) {
      line = `${line.substring(0, line.length - 1)}${lines[i + 1]}`
      i++
    }
    res.push(line)
  }

  return res
}

const cleanLines = (
  key: ChapterName | string,
  title: string,
  lines: string[]
) => {
  const res = lines[0]?.trim() === title ? lines.slice(1) : lines
  while (res.length && res[res.length - 1].match(/^[-\s]*$/))
    res.splice(res.length - 1)
  if (key === "Source_Code_Extract") return joinSplitLines(res)
  return res
}

export const parseDump = (xml: string, text: string) => {
  const parsed = parsexmlDump(xml)
  const splits = splitLines(
    text,
    parsed.chapters.map(c => c.line)
  )
  const chapters = new Map<string, Chapter>()
  parsed.chapters.forEach(chapter => {
    const { name, category, title } = chapter
    const key = getChapterName(chapter.name)
    const lines = cleanLines(key, title, splits[chapter.line] || [])
    chapters.set(key, { name, category, title, text: lines.join("\n") })
  })

  return {
    ...parsed,
    chapters
  }
}

export type SapDumpDetailed = ReturnType<typeof parseDump>
