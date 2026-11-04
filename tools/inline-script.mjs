// The builders emit minified classic scripts. Grammar string/regex literals can contain
// HTML delimiters: escape them before embedding, without changing their JavaScript values.
export function inlineScript(code) {
  return code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3c!--");
}
