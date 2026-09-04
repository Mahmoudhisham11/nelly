"use client";

import React from "react";
import { Sparkles, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

/**
 * Rich Markdown Renderer designed for World-Class AI Responses in Arabic (RTL)
 * Formats: Headers, Tables, Bullet points, Numbered lists, Bold highlights, Code pills, Blockquotes, Callouts
 */
export default function AiMarkdownRenderer({ content }) {
  if (!content) return null;

  // Split content by lines/blocks
  const lines = content.split("\n");
  const elements = [];
  let tableBuffer = [];
  let listBuffer = [];
  let isInsideList = false;
  let listType = "bullet"; // "bullet" or "numbered"

  const flushTable = (key) => {
    if (tableBuffer.length === 0) return;
    
    // Parse table rows
    const rows = tableBuffer
      .map(row => row.trim())
      .filter(row => row.startsWith("|") && row.endsWith("|"))
      .map(row => {
        return row
          .slice(1, -1)
          .split("|")
          .map(cell => cell.trim());
      })
      .filter(cols => cols.length > 0 && !cols.every(c => /^[-:\s]+$/.test(c)));

    if (rows.length > 0) {
      const headerRow = rows[0];
      const dataRows = rows.slice(1);

      elements.push(
        <div key={`table-${key}`} className="ai-markdown-table-wrapper">
          <table className="ai-markdown-table">
            <thead>
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    if (listType === "bullet") {
      elements.push(
        <ul key={`ul-${key}`} className="ai-markdown-ul">
          {listBuffer.map((item, idx) => (
            <li key={idx}>
              <span className="ai-list-bullet">✦</span>
              <div className="ai-list-content">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${key}`} className="ai-markdown-ol">
          {listBuffer.map((item, idx) => (
            <li key={idx}>
              <span className="ai-list-num num-font">{idx + 1}</span>
              <div className="ai-list-content">{renderInline(item)}</div>
            </li>
          ))}
        </ol>
      );
    }
    listBuffer = [];
    isInsideList = false;
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Check Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (isInsideList) flushList(lineIndex);
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable(lineIndex);
    }

    // Check Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const itemText = trimmed.replace(/^[-*•]\s+/, "");
      if (isInsideList && listType !== "bullet") flushList(lineIndex);
      isInsideList = true;
      listType = "bullet";
      listBuffer.push(itemText);
      return;
    }

    // Check Numbered list (e.g., 1. or 1-)
    const numMatch = trimmed.match(/^(\d+)[\.\-\)]\s+(.*)/);
    if (numMatch) {
      const itemText = numMatch[2];
      if (isInsideList && listType !== "numbered") flushList(lineIndex);
      isInsideList = true;
      listType = "numbered";
      listBuffer.push(itemText);
      return;
    }

    // If we were inside a list and hit a normal line
    if (isInsideList && trimmed !== "") {
      flushList(lineIndex);
    }

    if (trimmed === "") {
      if (isInsideList) flushList(lineIndex);
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${lineIndex}`} className="ai-heading-3">
          <Sparkles size={16} className="ai-heading-icon" />
          <span>{renderInline(trimmed.replace("### ", ""))}</span>
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} className="ai-heading-2">
          <span>{renderInline(trimmed.replace("## ", ""))}</span>
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${lineIndex}`} className="ai-heading-1">
          <span>{renderInline(trimmed.replace("# ", ""))}</span>
        </h2>
      );
      return;
    }

    // Blockquote or Callout
    if (trimmed.startsWith("> ")) {
      const calloutText = trimmed.replace(/^>\s*/, "");
      elements.push(
        <div key={`callout-${lineIndex}`} className="ai-callout-card">
          <div className="ai-callout-indicator" />
          <div className="ai-callout-body">
            {renderInline(calloutText)}
          </div>
        </div>
      );
      return;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(<hr key={`hr-${lineIndex}`} className="ai-divider" />);
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${lineIndex}`} className="ai-paragraph">
        {renderInline(trimmed)}
      </p>
    );
  });

  // Flush remaining buffers
  if (tableBuffer.length > 0) flushTable("end");
  if (listBuffer.length > 0) flushList("end");

  return <div className="ai-markdown-container">{elements}</div>;
}

/**
 * Parses inline markdown: Bold, Italic, Code, Currency badges, and Numbers
 */
function renderInline(text) {
  if (!text) return null;

  // Split by bold (**text**), code (`text`), or highlight tags
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      // Check if it's a number/currency highlight
      if (/\d+/.test(inner)) {
        parts.push(
          <strong key={match.index} className="ai-bold-highlight num-font">
            {inner}
          </strong>
        );
      } else {
        parts.push(
          <strong key={match.index} className="ai-bold-text">
            {inner}
          </strong>
        );
      }
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="ai-code-pill">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
