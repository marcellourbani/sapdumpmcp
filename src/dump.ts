import { ADTClient, Dump } from "abap-adt-api"
import { config } from "dotenv"
import { parseDump, SapDumpDetailed } from "./dumpparser.ts"
config()

export type SapDump = {
  id: string
  text: string
  error: string
  program: string
  timestamp: string
}

const createClient = async (
  url?: string,
  user?: string,
  password?: string,
  language?: string
) => {
  url ??= process.env.ABAP_ADT_URL
  user ??= process.env.ABAP_ADT_USER
  password ??= process.env.ABAP_ADT_PASSWORD
  language ??= process.env.ABAP_ADT_LANGUAGE
  if (!url || !user || !password) {
    throw new Error(
      "Url and credentials for ADT client are must be set in call headers or environment variables (ABAP_ADT_URL, ABAP_ADT_USER, ABAP_ADT_PASSWORD). Please set them before creating the client."
    )
  }
  const client = new ADTClient(url, user, password, undefined, language)
  await client.login()
  return client
}

const formatDump = (dump: Dump): SapDump => {
  const { id: rawid, text } = dump
  const id = decodeURIComponent(rawid)
  const timestamp = id.replace(/.*\//, "").substring(0, 14)
  const error =
    dump.categories.find(c => c.label.match(/error/))?.term || "Unknown error"
  const program =
    dump.categories.find(c => c.label.match(/program/))?.term ||
    "Unknown program"
  return { id, text, error, program, timestamp }
}

class DumpService {
  constructor(private client: ADTClient) {}
  private dumps: SapDump[] = []
  private detailedDumps: Map<string, SapDumpDetailed> = new Map()
  public listDumps = async (refresh = false) => {
    if (this.dumps.length === 0 || refresh) {
      const dumps = await this.client.dumps()
      this.dumps = dumps.dumps.map(d => formatDump(d))
    }
    return this.dumps
  }

  public getHtmlDump = async (id: string) => {
    const found = this.dumps.find(d => d.id === id)
    if (found) return found
    const dumps = await this.listDumps(true)
    const dump = dumps.find(d => d.id === id)
    if (!dump) throw new Error(`Dump with ID ${id} not found`)
    return dump
  }

  public getDumpDetails = async (id: string) => {
    // const cached = this.detailedDumps.get(id)
    // if (cached) return cached
    const baseId = encodeURIComponent(
      id.replace(/\/sap\/bc\/adt\/vit\/runtime\/dumps\//, "")
    )
    const xml = await this.client.httpClient.request(
      `/sap/bc/adt/runtime/dump/${baseId}`,
      { headers: { Accept: "application/vnd.sap.adt.runtime.dump.v1+xml" } }
    )
    const txt = await this.client.httpClient.request(
      `/sap/bc/adt/runtime/dump/${baseId}/formatted`,
      { headers: { Accept: "text/plain" } }
    )

    const dump = parseDump(xml.body, txt.body)
    this.detailedDumps.set(id, dump)
    return dump
  }
}

export const createDumpService = async (
  serverurl?: string,
  user?: string,
  password?: string,
  language?: string
) => {
  const client = await createClient(serverurl, user, password, language)
  return new DumpService(client)
}
