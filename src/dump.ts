import { ADTClient, Dump } from "abap-adt-api"
import { config } from "dotenv"
config()

const createClient = async () => {
  const url = process.env.ABAP_ADT_URL
  const user = process.env.ABAP_ADT_USER
  const password = process.env.ABAP_ADT_PASSWORD
  if (!url || !user || !password) {
    throw new Error(
      "Url and credentials for ADT client are not set in environment variables (ABAP_ADT_URL, ABAP_ADT_USER, ABAP_ADT_PASSWORD). Please set them before creating the client."
    )
  }
  const client = new ADTClient(url, user, password)
  await client.login()
  return client
}

const formatDump = (dump: Dump) => {
  const { id, text } = dump
  const error =
    dump.categories.find(c => c.label.match(/error/))?.term || "Unknown error"
  const program =
    dump.categories.find(c => c.label.match(/program/))?.term ||
    "Unknown program"
  return { id, text, error, program }
}

class DumpService {
  constructor(private client: ADTClient) {}
  public listDumps = async () => {
    const dumps = await this.client.dumps()
    return dumps.dumps.map(d => formatDump(d))
  }
}

export const createDumpService = async () => {
  const client = await createClient()
  return new DumpService(client)
}
