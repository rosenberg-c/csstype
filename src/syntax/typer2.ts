import { definitionSyntax, DSNodeGroup, DSNodeMultiplier } from 'css-tree';
import * as ts from 'typescript';

type Types =
  | ts.KeywordTypeNode<ts.SyntaxKind.StringKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.NumberKeyword>
  | ts.StringLiteral
  | ts.NumericLiteral
  | ts.Identifier;

export default function typer(node: DSNodeGroup): Types[] {
  const types: Types[] = [];
  let hasStringKeyword = false;
  // let hasNumbericKeyword = false;
  const stringLiterals: string[] = [];
  const numericLiterals: string[] = [];
  // const Identifiers: string[] = [];

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
              types.push(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
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
              types.push(ts.factory.createNumericLiteral(node.name));
              numericLiterals.push(node.name);
            }
          } else {
            if (!stringLiterals.includes(node.name)) {
              types.push(ts.factory.createStringLiteral(node.name));
              stringLiterals.push(node.name);
            }
          }
          break;
        case 'Type':
          types.push(ts.factory.createIdentifier(node.name));
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
