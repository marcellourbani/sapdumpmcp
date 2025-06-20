export const errorMessage = (error: unknown) => {
  if (!error) return "unknown error"
  if (typeof error === "object" && "message" in error) return `${error.message}`
  return `${error}`
}
