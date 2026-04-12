/**
 * ESLint rule: no-native-tailwind-colors
 *
 * Blocks usage of native Tailwind color classes (amber-100, slate-200, red-500, etc.)
 * in className attributes. Forces use of design system tokens instead.
 *
 * Story 11.2 — Epic C: Rigor Dark Mode e Design System
 */

const NATIVE_COLOR_PATTERN = /\b(amber|slate|gray|red|blue|green|yellow|orange|pink|purple|indigo|teal|cyan|rose|lime|emerald|sky|violet|fuchsia|zinc|neutral|stone)-\d+/;

const MESSAGE =
  'Classe de cor nativa do Tailwind detectada. ' +
  'Use token do design system (ex: text-primary-600, bg-badge-warning-bg). ' +
  'Ver docs/design-system/tokens.md.';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow native Tailwind color classes in className',
    },
    messages: {
      nativeColor: MESSAGE,
    },
    schema: [],
  },
  create(context) {
    function checkStringForNativeColors(node, value) {
      if (typeof value === 'string' && NATIVE_COLOR_PATTERN.test(value)) {
        context.report({ node, messageId: 'nativeColor' });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;

        const value = node.value;
        if (!value) return;

        // className="..."
        if (value.type === 'Literal' && typeof value.value === 'string') {
          checkStringForNativeColors(node, value.value);
        }

        // className={...}
        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;

          // className={"..."}
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkStringForNativeColors(node, expr.value);
          }

          // className={`...`}
          if (expr.type === 'TemplateLiteral') {
            for (const quasi of expr.quasis) {
              checkStringForNativeColors(node, quasi.value.raw);
            }
          }

          // className={cn("...", "...")}
          if (expr.type === 'CallExpression') {
            for (const arg of expr.arguments) {
              if (arg.type === 'Literal' && typeof arg.value === 'string') {
                checkStringForNativeColors(node, arg.value);
              }
              if (arg.type === 'TemplateLiteral') {
                for (const quasi of arg.quasis) {
                  checkStringForNativeColors(node, quasi.value.raw);
                }
              }
              // Ternary: condition ? "..." : "..."
              if (arg.type === 'ConditionalExpression') {
                if (arg.consequent.type === 'Literal') {
                  checkStringForNativeColors(node, arg.consequent.value);
                }
                if (arg.alternate.type === 'Literal') {
                  checkStringForNativeColors(node, arg.alternate.value);
                }
              }
            }
          }
        }
      },
    };
  },
};
