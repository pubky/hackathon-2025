import { useMemo } from 'react';

interface CodeHighlightProps {
  code: string;
  language?: string;
}

export function CodeHighlight({ code, language = 'rust' }: CodeHighlightProps) {
  const lines = useMemo(() => {
    const codeLines = code.split('\n');
    return codeLines.map((line, index) => ({
      number: index + 1,
      code: highlightRustCode(line)
    }));
  }, [code]);

  return (
    <pre className="text-sm overflow-x-auto bg-zinc-900 rounded-lg p-2" style={{ fontFamily: "'Fira Code', Fira Code, 'Courier New', monospace" }}>
      <code className="block">
        {lines.map((line) => (
          <div key={line.number} className="flex">
            <span className="inline-block w-8 text-right pr-4 text-zinc-500 select-none flex-shrink-0 py-0 leading-relaxed">
              {line.number}
            </span>
            <span
              className="flex-1 py-0 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: line.code }}
            />
          </div>
        ))}
      </code>
    </pre>
  );
}

function highlightRustCode(code: string): string {
  // Keywords
  const keywords = [
    'use', 'async', 'await', 'fn', 'let', 'mut', 'return', 'if', 'else',
    'match', 'while', 'for', 'loop', 'break', 'continue', 'impl', 'trait',
    'struct', 'enum', 'pub', 'mod', 'const', 'static', 'type', 'where',
    'unsafe', 'extern', 'crate', 'move', 'as', 'ref', 'in', 'self', 'Self'
  ];

  // Types
  const types = [
    'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
    'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
    'f32', 'f64', 'bool', 'char', 'str', 'String',
    'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc',
    'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet',
    'Ok', 'Err', 'Some', 'None', 'Client', 'PublicKey',
    'ListBuilder', 'anyhow'
  ];

  // Macros
  const macros = ['println!', 'print!', 'vec!', 'format!', 'panic!', 'assert!', 'tokio::main'];

  let highlighted = code;

  // Escape HTML
  highlighted = highlighted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight strings (double quotes)
  highlighted = highlighted.replace(
    /"([^"\\]*(\\.[^"\\]*)*)"/g,
    '<span class="text-green-400">"$1"</span>'
  );

  // Highlight comments
  highlighted = highlighted.replace(
    /\/\/.*/g,
    '<span class="text-zinc-500 italic">$&</span>'
  );

  // Highlight block comments
  highlighted = highlighted.replace(
    /\/\*[\s\S]*?\*\//g,
    '<span class="text-zinc-500 italic">$&</span>'
  );

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*|\.\d+)\b/g,
    '<span class="text-purple-400">$1</span>'
  );

  // Highlight keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(
      regex,
      `<span class="text-pink-400">${keyword}</span>`
    );
  });

  // Highlight types
  types.forEach(type => {
    const regex = new RegExp(`\\b${type}\\b`, 'g');
    highlighted = highlighted.replace(
      regex,
      `<span class="text-cyan-400">${type}</span>`
    );
  });

  // Highlight macros
  macros.forEach(macro => {
    const escapedMacro = macro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedMacro, 'g');
    highlighted = highlighted.replace(
      regex,
      `<span class="text-yellow-400">${macro}</span>`
    );
  });

  // Highlight attributes
  highlighted = highlighted.replace(
    /#\[([^\]]+)\]/g,
    '<span class="text-amber-400">#[$1]</span>'
  );

  // Highlight function names (word followed by !)
  highlighted = highlighted.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    '<span class="text-blue-400">$1</span>('
  );

  // Highlight special symbols
  highlighted = highlighted.replace(
    /(\?|&amp;|\||->|=>|::)/g,
    '<span class="text-orange-400">$1</span>'
  );

  return `<span class="text-zinc-200">${highlighted}</span>`;
}
