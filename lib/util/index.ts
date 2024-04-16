
export * from "./Util";
export * from "./Types";
export * from "./FieldUtil";

/*

? matches one character
* matches zero or more characters
** matches zero or more directories in a path

*/
export function patternToRegex(pattern: string) {
    pattern = pattern.replace(/:([\w])+/g, "**");
    const terminator = !pattern.includes("**") ? "!((.)+)" : "";
    const regex = pattern.replace(/\*\*/g, "(.)+").replace(/\?/g, "(.)").replace(/\*/g, "((?!(\/)).)+") + terminator;
    return new RegExp(regex);
}
