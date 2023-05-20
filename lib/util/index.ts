
export * from "./Util";
export * from "./Types";
export * from "./FieldUtil";

/*

? matches one character
* matches zero or more characters
** matches zero or more directories in a path

*/
export function antPatternToRegex(antPattern: string) {
    antPattern = antPattern.replace(/:([\w])+/g, "**");
    const terminator = !antPattern.includes("**") ? "!((.)+)" : "";
    const regex = antPattern.replace(/\*\*/g, "(.)+").replace(/\?/g, "(.)").replace(/\*/g, "((?!(\/)).)+") + terminator;
    return new RegExp(regex);
}
