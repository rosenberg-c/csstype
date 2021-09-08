import { definitionSyntax, DSNodeGroup, DSNodeMultiplier } from 'css-tree';

export enum Type {
  Alias,
  DataType,
  PropertyReference,
  Length,
  Time,
  StringLiteral,
  NumericLiteral,
  Array,
  String,
  Number,
}

interface IBasic {
  type: Type.String | Type.Number | Type.Length | Type.Time;
}

export interface IDataType<TTypeKind = Type.DataType | Type.PropertyReference> {
  type: TTypeKind;
  name: string;
}

export interface IStringLiteral {
  type: Type.StringLiteral;
  literal: string;
}

interface INumericLiteral {
  type: Type.NumericLiteral;
  literal: number;
}

export type DataType = IDataType<Type.DataType>;

// Yet another reminder; naming is hard
export type TypeType<TDataType = IDataType> = IBasic | IStringLiteral | INumericLiteral | TDataType;

export type ResolvedType = TypeType<DataType>;

export default function typer(node: DSNodeGroup): TypeType[] {
  const types: TypeType[] = [];
  let hasStringKeyword = false;
  let hasNumbericKeyword = false;
  let hasLength = false;
  let hasTime = false;
  const stringLiterals: string[] = [];
  const numericLiterals: string[] = [];
  const dataTypes: string[] = [];

  let skipGroup = 0;
  let skipMultiplier = false;
  const multipliersToSkip: DSNodeMultiplier[] = [];

  definitionSyntax.walk(node, {
    enter(node) {
      if (skipGroup > 0 || skipMultiplier) {
        return;
      }

      switch (node.type) {
        case 'Group':
          if (node.terms.length === 1) {
            return;
          }

          if (node.combinator === ' ' || node.combinator === '&&' || node.combinator === '||') {
            if (!hasStringKeyword) {
              types.push({ type: Type.String });
              hasStringKeyword = true;
            }

            let mandatoryTermsInGroup = 0;
            const mandatoryMulipliers: DSNodeMultiplier[] = [];

            if (node.combinator !== '||') {
              for (const term of node.terms) {
                if (term.type === 'Multiplier') {
                  if (term.min > 0) {
                    mandatoryMulipliers.push(term);
                    mandatoryTermsInGroup++;
                  }
                } else {
                  mandatoryTermsInGroup++;
                }
              }

              if (mandatoryTermsInGroup > 1) {
                // The whole group resolves to string for now,
                // like `something another-thing`
                skipGroup++;
              } else if (node.terms.length - mandatoryTermsInGroup === 1) {
                // Proceed with the only mandatory term in group,
                // like `something another-thing?`
                multipliersToSkip.push(...mandatoryMulipliers);
              }
            }
          }
          break;
        case 'Multiplier':
          if (multipliersToSkip.includes(node)) {
            skipMultiplier = true;
          }
          break;
        case 'Keyword':
          if (node.name === String(parseInt(node.name))) {
            if (!numericLiterals.includes(node.name)) {
              types.push({ type: Type.NumericLiteral, literal: parseInt(node.name) });
              numericLiterals.push(node.name);
            }
          } else {
            if (!stringLiterals.includes(node.name)) {
              types.push({ type: Type.StringLiteral, literal: node.name });
              stringLiterals.push(node.name);
            }
          }
          break;
        case 'Type':
          switch (node.name) {
            case 'number':
            case 'intager':
              if (!hasNumbericKeyword) {
                types.push({ type: Type.Number });
                hasNumbericKeyword = true;
              }
              break;
            case 'length':
              if (!hasLength) {
                types.push({ type: Type.Length });
                hasLength = true;
              }
              break;
            case 'time':
              if (!hasTime) {
                types.push({ type: Type.Time });
                hasTime = true;
              }
              break;
            default:
              if (!dataTypes.includes(node.name)) {
                types.push({ type: Type.DataType, name: node.name });
                dataTypes.push(node.name);
              }
              break;
          }
          break;
      }
    },
    leave(node) {
      if (node.type === 'Group' && skipGroup > 0) {
        skipGroup--;
      }
      if (node.type === 'Multiplier' && skipMultiplier) {
        skipMultiplier = false;
      }
    },
  });
  return types;
}

export function hasType(types: TypeType[], type: TypeType): boolean {
  switch (type.type) {
    case Type.Length:
      return types.some(t => t.type === Type.Length);
    case Type.Time:
      return types.some(t => t.type === Type.Time);
    case Type.String:
      return types.some(t => t.type === Type.String);
    case Type.Number:
      return types.some(t => t.type === Type.Number);
    case Type.StringLiteral:
      return types.some(t => t.type === Type.StringLiteral && t.literal === type.literal);
    case Type.NumericLiteral:
      return types.some(t => t.type === Type.NumericLiteral && t.literal === type.literal);
    case Type.DataType:
      return types.some(t => t.type === Type.DataType && t.type === type.type);
    case Type.PropertyReference:
      return types.some(t => t.type === Type.PropertyReference && t.name === type.name);
  }
}
