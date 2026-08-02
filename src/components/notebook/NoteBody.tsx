"use client";

import { ImageIcon } from "lucide-react";

/**
 * Compact markup used by notebook templates:
 *   # Heading
 *   [] checkbox item
 *   - bullet   (a bare "-" or "- []" renders as a muted placeholder)
 *   1. numbered item
 *   | a | b | c        (consecutive lines form one table; first row = header)
 *   @img               (image drop placeholder)
 *   (blank line)       vertical space
 *   anything else      paragraph
 * Tokens like "List", "...", "....." render muted (template placeholders).
 */

export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "muted"; text: string }
  | { type: "check"; text: string }
  | { type: "bullet"; text: string }
  | { type: "number"; num: string; text: string }
  | { type: "image" }
  | { type: "space" }
  | { type: "table"; rows: string[][] };

const PLACEHOLDER = new Set(["List", "...", ".....", "[]", "[ ]"]);

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === "") {
      blocks.push({ type: "space" });
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(
          lines[i]
            .trim()
            .split("|")
            .slice(1)
            .map((c) => c.trim()),
        );
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    if (line === "@img") blocks.push({ type: "image" });
    else if (line.startsWith("# ")) blocks.push({ type: "heading", text: line.slice(2) });
    else if (line.startsWith("[] ")) blocks.push({ type: "check", text: line.slice(3) });
    else if (line === "[]") blocks.push({ type: "check", text: "" });
    else if (line.startsWith("- ")) {
      const t = line.slice(2);
      blocks.push(PLACEHOLDER.has(t) ? { type: "muted", text: t } : { type: "bullet", text: t });
    } else if (line === "-") blocks.push({ type: "bullet", text: "" });
    else {
      const m = line.match(/^(\d+)\.\s+(.*)$/);
      if (m) blocks.push({ type: "number", num: m[1], text: m[2] });
      else blocks.push(PLACEHOLDER.has(line) ? { type: "muted", text: line } : { type: "text", text: line });
    }
    i++;
  }
  return blocks;
}

export function toPlainText(src: string): string {
  return parseBlocks(src)
    .map((b) => {
      switch (b.type) {
        case "heading":
          return "\n" + b.text;
        case "check":
          return "[ ] " + b.text;
        case "bullet":
          return "• " + b.text;
        case "number":
          return b.num + ". " + b.text;
        case "image":
          return "[Add image]";
        case "space":
          return "";
        case "table":
          return b.rows.map((r) => r.join("\t")).join("\n");
        default:
          return b.text;
      }
    })
    .join("\n")
    .trim();
}

function statColor(text: string): string {
  if (/^wins:/i.test(text)) return "text-emerald-600";
  if (/^losses:/i.test(text)) return "text-red-500";
  if (/^breakeven:/i.test(text)) return "text-teal-500";
  return "text-gray-700";
}

export default function NoteBody({ src }: { src: string }) {
  const blocks = parseBlocks(src);
  return (
    <div className="text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h3 key={i} className="mt-6 mb-1 text-lg font-bold text-gray-900 first:mt-0">
                {b.text}
              </h3>
            );
          case "text":
            return (
              <p key={i} className={`${statColor(b.text)} my-0.5`}>
                {b.text}
              </p>
            );
          case "muted":
            return (
              <p key={i} className="my-0.5 italic text-gray-300">
                {b.text}
              </p>
            );
          case "check":
            return (
              <label key={i} className="my-1 flex items-center gap-2.5 text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />
                {b.text}
              </label>
            );
          case "bullet":
            return (
              <div key={i} className="my-0.5 flex gap-2 text-gray-700">
                <span className="text-gray-400">•</span>
                <span>{b.text}</span>
              </div>
            );
          case "number":
            return (
              <div key={i} className="my-0.5 flex gap-2 text-gray-700">
                <span className="text-gray-400">{b.num}.</span>
                <span className={PLACEHOLDER.has(b.text) ? "italic text-gray-300" : ""}>{b.text}</span>
              </div>
            );
          case "image":
            return (
              <div
                key={i}
                className="my-2 flex items-center gap-2 rounded-lg bg-gray-100/70 px-4 py-3 text-sm text-gray-400"
              >
                <ImageIcon size={16} /> Add image
              </div>
            );
          case "space":
            return <div key={i} className="h-3" />;
          case "table":
            return (
              <div key={i} className="my-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => {
                          const Tag = r === 0 ? "th" : "td";
                          return (
                            <Tag
                              key={c}
                              className={`border border-gray-200 px-3 py-2 text-left align-top ${
                                r === 0 ? "bg-gray-50 font-semibold text-gray-700" : "text-gray-700"
                              }`}
                            >
                              {cell}
                            </Tag>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
