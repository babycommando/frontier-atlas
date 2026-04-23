export function parseAbstract(input?: string | null): string {
  if (!input) return "";

  return input
    .replace(/\r?\n/g, " ")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\emph\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\mathcal\{([^{}]*)\}/g, "$1")
    .replace(/\\operatorname\{([^{}]*)\}/g, "$1")
    .replace(/\\min\b/g, "min")
    .replace(/\\max\b/g, "max")
    .replace(/\\leq\b/g, "≤")
    .replace(/\\geq\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\in\b/g, "∈")
    .replace(/\\to\b/g, "→")
    .replace(/\\times\b/g, "×")
    .replace(/\\cdot\b/g, "·")
    .replace(/_\{([^{}]*)\}/g, "_$1")
    .replace(/\^\{([^{}]*)\}/g, "^$1")
    .replace(/\\_/g, "_")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/[{}]/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
