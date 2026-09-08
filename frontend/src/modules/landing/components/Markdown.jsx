import React from 'react';

// Minimal renderer for the small, controlled subset of Markdown used by
// the legal pages: `#` / `##` headings, `-` bullet lists, and paragraphs.
// Intentionally not a general Markdown parser.
export const Markdown = ({ content = '' }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: 'ul', items: list });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2) });
    } else if (line.startsWith('- ')) {
      flushPara();
      (list ||= []).push(line.slice(2));
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.type === 'h1') {
          return (
            <h1 key={i} className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {block.text}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={i} className="pt-4 text-lg font-bold text-slate-900 dark:text-white">
              {block.text}
            </h2>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

export default Markdown;
