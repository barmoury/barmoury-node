
export * from "./Type";
export * from "./Valid";
export * from "./Required";
export * from "./Validate";
export * from "./AjvSchema";
export * from "./ColumnExists";
export * from "./ColumnUnique";
export * from "./ValidateEnum";
export * from "./ValidateArray";
export * from "./ValidationException";
export * from "./CollectionValuesExists";

/*
@Optional 
optionalProperties: {
    bar: {type: "string"}
  }

@NumberRange, @StringRange
multipleRestrictedTypesKey: {
      oneOf: [
        { type: 'string', maxLength: 5 },
        { type: 'number', minimum: 10 }
      ]
    },

@NotTypes({ types: [ "string", "number" ] })
notTypeKey: {
    not: { type: 'array' }
}


*/