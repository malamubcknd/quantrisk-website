// type TokenType = 'NUMBER' | 'IDENT' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

// interface Token {
//   type: TokenType;
//   value: string;
//   pos: number;
// }

// const SAFE_FUNCTIONS = new Set(['abs', 'min', 'max', 'round', 'sqrt']);

// function normalizeName(name: string): string {
//   return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
// }

// function tokenize(input: string): Token[] {
//   const tokens: Token[] = [];
//   let i = 0;

//   while (i < input.length) {
//     const ch = input[i];

//     if (/\s/.test(ch)) { i++; continue; }

//     if (/[0-9.]/.test(ch)) {
//       let num = '';
//       const start = i;
//       while (i < input.length && /[0-9.]/.test(input[i])) {
//         num += input[i]; i++;
//       }
//       tokens.push({ type: 'NUMBER', value: num, pos: start });
//       continue;
//     }

//     if (/[a-zA-Z_]/.test(ch)) {
//       let ident = '';
//       const start = i;
//       while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
//         ident += input[i]; i++;
//       }
//       tokens.push({ type: 'IDENT', value: ident, pos: start });
//       continue;
//     }

//     if ('+-*/%^'.includes(ch)) {
//       tokens.push({ type: 'OP', value: ch, pos: i }); i++;
//       continue;
//     }

//     if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(', pos: i }); i++; continue; }
//     if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')', pos: i }); i++; continue; }
//     if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', pos: i }); i++; continue; }

//     throw new Error(`Unexpected character '${ch}' at position ${i}`);
//   }

//   tokens.push({ type: 'EOF', value: '', pos: i });
//   return tokens;
// }

// class Parser {
//   private tokens: Token[];
//   private pos: number;
//   private variables: Record<string, number>;

//   constructor(tokens: Token[], variables: Record<string, number>) {
//     this.tokens = tokens;
//     this.pos = 0;
//     this.variables = variables;
//   }

//   private peek(): Token {
//     const t = this.tokens[this.pos];
//     return t !== undefined ? t : { type: 'EOF' as const, value: '', pos: -1 };
//   }

//   private advance(): Token {
//     const t = this.tokens[this.pos];
//     this.pos++;
//     return t !== undefined ? t : { type: 'EOF' as const, value: '', pos: -1 };
//   }

//   private expect(type: TokenType): Token {
//     const tok = this.advance();
//     if (tok.type !== type) throw new Error(`Expected ${type}, got ${tok.type} at pos ${tok.pos}`);
//     return tok;
//   }

//   parse(): number {
//     const result = this.expression();
//     if (this.peek().type !== 'EOF') {
//       throw new Error(`Unexpected token '${this.peek().value}' at pos ${this.peek().pos}`);
//     }
//     return result;
//   }

//   private expression(): number {
//     let left = this.term();
//     while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
//       const op = this.advance().value;
//       const right = this.term();
//       left = op === '+' ? left + right : left - right;
//     }
//     return left;
//   }

//   private term(): number {
//     let left = this.power();
//     while (this.peek().type === 'OP' && '*/%'.includes(this.peek().value)) {
//       const op = this.advance().value;
//       const right = this.power();
//       if (op === '*') left = left * right;
//       else if (op === '/') {
//         if (right === 0) throw new Error('Division by zero');
//         left = left / right;
//       } else {
//         left = left % right;
//       }
//     }
//     return left;
//   }

//   private power(): number {
//     let base = this.unary();
//     if (this.peek().type === 'OP' && this.peek().value === '^') {
//       this.advance();
//       const exp = this.unary();
//       base = Math.pow(base, exp);
//     }
//     return base;
//   }

//   private unary(): number {
//     if (this.peek().type === 'OP' && this.peek().value === '-') {
//       this.advance();
//       return -this.primary();
//     }
//     if (this.peek().type === 'OP' && this.peek().value === '+') {
//       this.advance();
//       return this.primary();
//     }
//     return this.primary();
//   }

//   private primary(): number {
//     const tok = this.peek();

//     if (tok.type === 'NUMBER') {
//       this.advance();
//       const val = parseFloat(tok.value);
//       if (isNaN(val)) throw new Error(`Invalid number: ${tok.value}`);
//       return val;
//     }

//     if (tok.type === 'IDENT') {
//       this.advance();
//       const name = normalizeName(tok.value);

//       if (this.peek().type === 'LPAREN' && SAFE_FUNCTIONS.has(name)) {
//         this.advance();
//         const args: number[] = [];
//         if (this.peek().type !== 'RPAREN') {
//           args.push(this.expression());
//           while (this.peek().type === 'COMMA') {
//             this.advance();
//             args.push(this.expression());
//           }
//         }
//         this.expect('RPAREN');
//         return this.callFunction(name, args);
//       }

//       if (name in this.variables) {
//         return this.variables[name];
//       }

//       throw new Error(`Unknown variable '${tok.value}'. Available: ${Object.keys(this.variables).join(', ')}`);
//     }

//     if (tok.type === 'LPAREN') {
//       this.advance();
//       const val = this.expression();
//       this.expect('RPAREN');
//       return val;
//     }

//     throw new Error(`Unexpected token '${tok.value}' at pos ${tok.pos}`);
//   }

//   private callFunction(name: string, args: number[]): number {
//     switch (name) {
//       case 'abs': return Math.abs(args[0]);
//       case 'sqrt': return Math.sqrt(args[0]);
//       case 'min': return Math.min(...args);
//       case 'max': return Math.max(...args);
//       case 'round': return args.length > 1 ? parseFloat(args[0].toFixed(args[1])) : Math.round(args[0]);
//       default: throw new Error(`Unknown function: ${name}`);
//     }
//   }
// }

// export function evaluateFormula(
//   formula: string,
//   variables: Record<string, number>
// ): { value: number; error: null } | { value: null; error: string } {
//   try {
//     if (!formula.trim()) return { value: null, error: 'Empty formula' };

//     const normVars: Record<string, number> = {};
//     for (const [k, v] of Object.entries(variables)) {
//       normVars[normalizeName(k)] = v;
//     }

//     const tokens = tokenize(formula.toLowerCase().replace(/-(?=[a-z])/g, '_'));
//     const parser = new Parser(tokens, normVars);
//     const result = parser.parse();

//     if (!isFinite(result)) return { value: null, error: 'Result is not finite' };

//     return { value: result, error: null };
//   } catch (e) {
//     return { value: null, error: e instanceof Error ? e.message : 'Evaluation failed' };
//   }
// }

// export { normalizeName };



type TokenType =
  | 'NUMBER'
  | 'IDENT'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const SAFE_FUNCTIONS = new Set([
  'abs',
  'min',
  'max',
  'round',
  'sqrt',
]);

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // The index is checked against input.length before access.
    const ch = input[i]!;

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = '';
      const start = i;
      let decimalPoints = 0;

      while (
        i < input.length &&
        /[0-9.]/.test(input[i]!)
      ) {
        const current = input[i]!;

        if (current === '.') {
          decimalPoints++;

          if (decimalPoints > 1) {
            throw new Error(
              `Invalid number at position ${start}`
            );
          }
        }

        num += current;
        i++;
      }

      // Prevent invalid numeric literals such as ".".
      if (num === '.') {
        throw new Error(`Invalid number at position ${start}`);
      }

      tokens.push({
        type: 'NUMBER',
        value: num,
        pos: start,
      });

      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      const start = i;

      while (
        i < input.length &&
        /[a-zA-Z0-9_]/.test(input[i]!)
      ) {
        ident += input[i]!;
        i++;
      }

      tokens.push({
        type: 'IDENT',
        value: ident,
        pos: start,
      });

      continue;
    }

    if ('+-*/%^'.includes(ch)) {
      tokens.push({
        type: 'OP',
        value: ch,
        pos: i,
      });

      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }

    throw new Error(
      `Unexpected character '${ch}' at position ${i}`
    );
  }

  tokens.push({
    type: 'EOF',
    value: '',
    pos: i,
  });

  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos: number;
  private variables: Record<string, number>;

  constructor(
    tokens: Token[],
    variables: Record<string, number>
  ) {
    this.tokens = tokens;
    this.pos = 0;
    this.variables = variables;
  }

  private peek(): Token {
    const token = this.tokens[this.pos];

    return token !== undefined
      ? token
      : { type: 'EOF', value: '', pos: -1 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;

    return token !== undefined
      ? token
      : { type: 'EOF', value: '', pos: -1 };
  }

  private expect(type: TokenType): Token {
    const token = this.advance();

    if (token.type !== type) {
      throw new Error(
        `Expected ${type}, got ${token.type} at pos ${token.pos}`
      );
    }

    return token;
  }

  parse(): number {
    const result = this.expression();

    if (this.peek().type !== 'EOF') {
      const token = this.peek();

      throw new Error(
        `Unexpected token '${token.value}' at pos ${token.pos}`
      );
    }

    return result;
  }

  private expression(): number {
    let left = this.term();

    while (
      this.peek().type === 'OP' &&
      (this.peek().value === '+' ||
        this.peek().value === '-')
    ) {
      const op = this.advance().value;
      const right = this.term();

      left = op === '+' ? left + right : left - right;
    }

    return left;
  }

  private term(): number {
    let left = this.power();

    while (
      this.peek().type === 'OP' &&
      '*/%'.includes(this.peek().value)
    ) {
      const op = this.advance().value;
      const right = this.power();

      if (op === '*') {
        left = left * right;
      } else if (op === '/') {
        if (right === 0) {
          throw new Error('Division by zero');
        }

        left = left / right;
      } else {
        left = left % right;
      }
    }

    return left;
  }

  private power(): number {
    let base = this.unary();

    if (
      this.peek().type === 'OP' &&
      this.peek().value === '^'
    ) {
      this.advance();

      const exponent = this.unary();
      base = Math.pow(base, exponent);
    }

    return base;
  }

  private unary(): number {
    if (
      this.peek().type === 'OP' &&
      this.peek().value === '-'
    ) {
      this.advance();
      return -this.primary();
    }

    if (
      this.peek().type === 'OP' &&
      this.peek().value === '+'
    ) {
      this.advance();
      return this.primary();
    }

    return this.primary();
  }

  private primary(): number {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.advance();

      const value = Number(token.value);

      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number: ${token.value}`);
      }

      return value;
    }

    if (token.type === 'IDENT') {
      this.advance();

      const name = normalizeName(token.value);

      if (
        this.peek().type === 'LPAREN' &&
        SAFE_FUNCTIONS.has(name)
      ) {
        this.advance();

        const args: number[] = [];

        if (this.peek().type !== 'RPAREN') {
          args.push(this.expression());

          while (this.peek().type === 'COMMA') {
            this.advance();
            args.push(this.expression());
          }
        }

        this.expect('RPAREN');

        return this.callFunction(name, args);
      }

      if (
        Object.prototype.hasOwnProperty.call(
          this.variables,
          name
        )
      ) {
        const value = this.variables[name];

        if (value === undefined) {
          throw new Error(
            `Variable '${token.value}' has no value`
          );
        }

        return value;
      }

      throw new Error(
        `Unknown variable '${token.value}'. Available: ${Object.keys(this.variables).join(', ')}`
      );
    }

    if (token.type === 'LPAREN') {
      this.advance();

      const value = this.expression();

      this.expect('RPAREN');

      return value;
    }

    throw new Error(
      `Unexpected token '${token.value}' at pos ${token.pos}`
    );
  }

  private callFunction(
    name: string,
    args: number[]
  ): number {
    const requireArg = (index: number): number => {
      const value = args[index];

      if (value === undefined) {
        throw new Error(
          `Function '${name}' is missing argument ${index + 1}`
        );
      }

      return value;
    };

    switch (name) {
      case 'abs':
        return Math.abs(requireArg(0));

      case 'sqrt':
        return Math.sqrt(requireArg(0));

      case 'min':
        if (args.length === 0) {
          throw new Error(
            'Function min requires at least one argument'
          );
        }

        return Math.min(...args);

      case 'max':
        if (args.length === 0) {
          throw new Error(
            'Function max requires at least one argument'
          );
        }

        return Math.max(...args);

      case 'round': {
        const value = requireArg(0);

        if (args.length > 1) {
          const digits = requireArg(1);

          if (
            !Number.isInteger(digits) ||
            digits < 0 ||
            digits > 100
          ) {
            throw new Error(
              'round precision must be an integer between 0 and 100'
            );
          }

          return parseFloat(value.toFixed(digits));
        }

        return Math.round(value);
      }

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}

export function evaluateFormula(
  formula: string,
  variables: Record<string, number>
):
  | { value: number; error: null }
  | { value: null; error: string } {
  try {
    if (!formula.trim()) {
      return { value: null, error: 'Empty formula' };
    }

    const normalizedVariables: Record<string, number> = {};

    for (const [key, value] of Object.entries(variables)) {
      normalizedVariables[normalizeName(key)] = value;
    }

    const normalizedFormula = formula
      .toLowerCase()
      .replace(/-(?=[a-z])/g, '_');

    const tokens = tokenize(normalizedFormula);
    const parser = new Parser(tokens, normalizedVariables);
    const result = parser.parse();

    if (!Number.isFinite(result)) {
      return {
        value: null,
        error: 'Result is not finite',
      };
    }

    return {
      value: result,
      error: null,
    };
  } catch (error: unknown) {
    return {
      value: null,
      error:
        error instanceof Error
          ? error.message
          : 'Evaluation failed',
    };
  }
}

export { normalizeName };
