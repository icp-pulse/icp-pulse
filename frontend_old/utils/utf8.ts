export function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  // Node fallback
  // @ts-ignore
  return Buffer.from(bytes).toString('utf8')
}
