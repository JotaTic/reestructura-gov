"use client";

import Link from "next/link";
import React from "react";

/**
 * Renderer markdown MUY ligero, sanitizado por construcción:
 * - **negrita**
 * - *itálica*
 * - [texto](/ruta) — enlaces internos (via next/link) o externos (rel=noopener)
 * - Listas con "- " al inicio de línea
 * - Párrafos separados por línea en blanco
 *
 * Nunca usa dangerouslySetInnerHTML.
 */

type Token =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "link"; value: string; href: string };

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    // Link [text](href)
    if (line[i] === "[") {
      const close = line.indexOf("]", i + 1);
      if (close > -1 && line[close + 1] === "(") {
        const parenClose = line.indexOf(")", close + 2);
        if (parenClose > -1) {
          const text = line.slice(i + 1, close);
          const href = line.slice(close + 2, parenClose);
          tokens.push({ kind: "link", value: text, href });
          i = parenClose + 1;
          continue;
        }
      }
    }
    // Bold **...**
    if (line[i] === "*" && line[i + 1] === "*") {
      const end = line.indexOf("**", i + 2);
      if (end > -1) {
        tokens.push({ kind: "bold", value: line.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Italic *...*
    if (line[i] === "*") {
      const end = line.indexOf("*", i + 1);
      if (end > -1) {
        tokens.push({ kind: "italic", value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Plain char
    const last = tokens[tokens.length - 1];
    if (last && last.kind === "text") {
      last.value += line[i];
    } else {
      tokens.push({ kind: "text", value: line[i] });
    }
    i += 1;
  }
  return tokens;
}

function renderTokens(tokens: Token[], onNavigate?: () => void): React.ReactNode {
  return tokens.map((t, idx) => {
    if (t.kind === "text") return <React.Fragment key={idx}>{t.value}</React.Fragment>;
    if (t.kind === "bold") return <strong key={idx}>{t.value}</strong>;
    if (t.kind === "italic") return <em key={idx}>{t.value}</em>;
    if (t.kind === "link") {
      const isInternal = t.href.startsWith("/");
      if (isInternal) {
        return (
          <Link
            key={idx}
            href={t.href}
            onClick={onNavigate}
            className="font-medium text-brand-700 underline hover:text-brand-900"
          >
            {t.value}
          </Link>
        );
      }
      return (
        <a
          key={idx}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-700 underline hover:text-brand-900"
        >
          {t.value}
        </a>
      );
    }
    return null;
  });
}

export function LightMarkdown({
  text,
  onNavigate,
}: {
  text: string;
  onNavigate?: () => void;
}) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let currentList: string[] | null = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-0.5 pl-5">
          {currentList.map((item, i) => (
            <li key={i}>{renderTokens(tokenize(item), onNavigate)}</li>
          ))}
        </ul>
      );
    }
    currentList = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      return;
    }
    const listMatch = /^(\d+\.|-)\s+(.*)$/.exec(line);
    if (listMatch) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[2]);
      return;
    }
    flushList();
    blocks.push(
      <p key={`p-${idx}`}>
        {renderTokens(tokenize(line), onNavigate)}
      </p>
    );
  });
  flushList();

  return <div className="space-y-2 text-sm leading-snug">{blocks}</div>;
}
