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

const ok = <K extends string, R extends Record<K, unknown>>(raw: R): [K] =>
  Object.keys(raw) as [K]

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
    parseAttributeValue: true
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
  const lines = text.split("\n").map(line => line.replace(/^\|(.*)\|$/, "$1"))
  const ranges = starts
    .map((start, index): [number, number] => [
      start,
      starts[index + 1] ? starts[index + 1] : lines.length + 1
    ])
    .map(([start, end]) => [start, lines.slice(start - 1, end)] as const)
  return ranges.reduce((acc, [start, ls]) => ({ ...acc, [start]: ls }), {})
}

export const parseDump = (xml: string, text: string) => {
  const parsed = parsexmlDump(xml)
  const splits = splitLines(
    text,
    parsed.chapters.map(c => c.line)
  )
  const chapters = parsed.chapters.map(chapter => ({
    lines: splits[chapter.line] || [],
    ...chapter
  }))

  return {
    ...parsed,
    chapters
  }
}
