
export * from "./Util";
export * from "./Types";
export * from "./FieldUtil";

/*

? matches one character
* matches zero or more characters
** matches zero or more directories in a path

*/
export function antPatternToRegex(antPattern: string) {
    const terminator = !antPattern.includes("**") ? "!((.)+)" : "";
    return new RegExp(antPattern.replace("**", "(.)+").replace("?", "(.)").replace("*", "((?!(\/)).)+") + terminator);
}
