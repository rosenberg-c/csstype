import * as ts from 'typescript';
import parse from '../src/syntax/parser2';
import typing from '../src/syntax/typer2';

describe('typing', () => {
  it('types combinators', () => {
    expect(typing(parse('something another-thing'))).toHaveLength(1);
    expect(typing(parse('something && another-thing'))).toHaveLength(1);
    expect(typing(parse('something || another-thing'))).toHaveLength(3);
    expect(typing(parse('something | another-thing'))).toHaveLength(2);
  });

  it('types components', () => {
    expect(typing(parse('something | 100 | <color>'))).toMatchObject([
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
      { kind: ts.SyntaxKind.Identifier },
    ]);
  });

  it('types optional components', () => {
    expect(typing(parse('something another-thing? | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something another-thing? yet-another-thing? | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something? another-thing yet-another-thing? | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something? another-thing? yet-another-thing | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something? another-thing? yet-another-thing? | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something another-thing yet-another-thing? | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something another-thing? yet-another-thing | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
    expect(typing(parse('something? another-thing yet-another-thing | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
  });

  it('does not duplicate types', () => {
    expect(typing(parse('something? another-thing | something? another-thing | 100 | 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.StringLiteral },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
  });

  it('types optional group components', () => {
    expect(typing(parse('[ something another-thing ]? 100'))).toMatchObject([
      { kind: ts.SyntaxKind.StringKeyword },
      { kind: ts.SyntaxKind.NumericLiteral },
    ]);
  });

  it('types number with range', () => {
    expect(typing(parse('<number [1,1000]>'))).toMatchObject([{ kind: ts.SyntaxKind.NumberKeyword }]);
  });
});
