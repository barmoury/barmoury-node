
export { FieldUtil } from "./FieldUtil";
export { CallBack, Logger, BarmouryObject } from "./Types";

/*

? matches one character
* matches zero or more characters
** matches zero or more directories in a path

*/
export function antPatternToRegex(antPattern: string) {
    return new RegExp(antPattern.replace("**", "(.)+").replace("?", "(.)").replace("*", "((?!(\/)).)+"));
}
