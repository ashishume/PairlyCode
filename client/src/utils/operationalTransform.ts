// Operational Transformation utilities for collaborative editing
// This provides basic OT (Operational Transformation) to handle concurrent edits

export interface TextOperation {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
}

export interface Position {
  lineNumber: number;
  column: number;
}

export interface Range {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Transform an operation against another operation
 * This is a simplified OT implementation - in production, consider using a library like ShareJS
 */
export function transformOperation(
  operation: TextOperation,
  otherOperation: TextOperation,
  priority: "left" | "right" = "left"
): TextOperation {
  const op = { ...operation };
  const otherOp = { ...otherOperation };

  // If operations don't overlap, no transformation needed
  if (!rangesOverlap(op.range, otherOp.range)) {
    // Check if we need to adjust position due to other operation
    if (
      comparePositions(
        {
          lineNumber: otherOp.range.endLineNumber,
          column: otherOp.range.endColumn,
        },
        { lineNumber: op.range.startLineNumber, column: op.range.startColumn }
      ) <= 0
    ) {
      // Other operation is before this one, adjust position
      const adjustment = calculatePositionAdjustment(otherOp);
      op.range = adjustRange(op.range, adjustment);
    }
    return op;
  }

  // Handle overlapping operations
  return handleOverlappingOperations(op, otherOp, priority);
}

/**
 * Transform multiple operations against each other
 */
export function transformOperations(
  operations: TextOperation[],
  otherOperations: TextOperation[]
): TextOperation[] {
  let transformedOps = [...operations];

  for (const otherOp of otherOperations) {
    transformedOps = transformedOps.map((op) =>
      transformOperation(op, otherOp)
    );
  }

  return transformedOps;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(range1: Range, range2: Range): boolean {
  const start1 = {
    lineNumber: range1.startLineNumber,
    column: range1.startColumn,
  };
  const end1 = { lineNumber: range1.endLineNumber, column: range1.endColumn };
  const start2 = {
    lineNumber: range2.startLineNumber,
    column: range2.startColumn,
  };
  const end2 = { lineNumber: range2.endLineNumber, column: range2.endColumn };

  return !(
    comparePositions(end1, start2) <= 0 || comparePositions(end2, start1) <= 0
  );
}

/**
 * Compare two positions
 * Returns: -1 if pos1 < pos2, 0 if equal, 1 if pos1 > pos2
 */
function comparePositions(pos1: Position, pos2: Position): number {
  if (pos1.lineNumber !== pos2.lineNumber) {
    return pos1.lineNumber - pos2.lineNumber;
  }
  return pos1.column - pos2.column;
}

/**
 * Calculate position adjustment from an operation
 */
function calculatePositionAdjustment(operation: TextOperation): Position {
  const { range, text } = operation;
  const deletedLines = range.endLineNumber - range.startLineNumber;
  const textLines = text.split("\n");
  const addedLines = textLines.length - 1;

  const lineDiff = addedLines - deletedLines;

  if (lineDiff === 0 && range.startLineNumber === range.endLineNumber) {
    // Single line operation
    const deletedChars = range.endColumn - range.startColumn;
    const addedChars = textLines[0].length;
    const columnDiff = addedChars - deletedChars;

    return {
      lineNumber: 0,
      column: columnDiff,
    };
  }

  return {
    lineNumber: lineDiff,
    column: 0,
  };
}

/**
 * Adjust a range by a position adjustment
 */
function adjustRange(range: Range, adjustment: Position): Range {
  return {
    startLineNumber: range.startLineNumber + adjustment.lineNumber,
    startColumn:
      range.startColumn + (adjustment.lineNumber === 0 ? adjustment.column : 0),
    endLineNumber: range.endLineNumber + adjustment.lineNumber,
    endColumn:
      range.endColumn + (adjustment.lineNumber === 0 ? adjustment.column : 0),
  };
}

/**
 * Handle overlapping operations with priority resolution
 */
function handleOverlappingOperations(
  operation: TextOperation,
  otherOperation: TextOperation,
  priority: "left" | "right"
): TextOperation {
  const op = { ...operation };
  const otherOp = { ...otherOperation };

  // For simplicity, if operations overlap, we'll apply a basic resolution
  // In a production system, you'd want more sophisticated conflict resolution

  if (priority === "left") {
    // This operation has priority, adjust other operation's effect
    const adjustment = calculatePositionAdjustment(otherOp);
    op.range = adjustRange(op.range, adjustment);
  } else {
    // Other operation has priority, this operation might need to be adjusted
    // For now, we'll just return the original operation
    // In practice, you'd implement more complex logic here
  }

  return op;
}

/**
 * Apply a set of operations to text content
 */
export function applyOperations(
  content: string,
  operations: TextOperation[]
): string {
  let lines = content.split("\n");

  // Sort operations by position (reverse order to maintain positions)
  const sortedOps = [...operations].sort((a, b) => {
    if (a.range.startLineNumber !== b.range.startLineNumber) {
      return b.range.startLineNumber - a.range.startLineNumber;
    }
    return b.range.startColumn - a.range.startColumn;
  });

  for (const op of sortedOps) {
    const { range, text } = op;
    const startLine = range.startLineNumber - 1; // Convert to 0-based
    const startCol = range.startColumn - 1; // Convert to 0-based
    const endLine = range.endLineNumber - 1; // Convert to 0-based
    const endCol = range.endColumn - 1; // Convert to 0-based

    // Ensure we don't go out of bounds
    if (startLine < 0 || startLine >= lines.length) {
      continue;
    }

    if (startLine === endLine) {
      // Single line operation
      const line = lines[startLine];
      const before = line.substring(0, startCol);
      const after = line.substring(endCol);
      lines[startLine] = before + text + after;
    } else {
      // Multi-line operation
      const startLineBefore = lines[startLine].substring(0, startCol);
      const endLineAfter =
        endLine < lines.length ? lines[endLine].substring(endCol) : "";

      const newText = startLineBefore + text + endLineAfter;
      const newLines = newText.split("\n");

      // Replace the range with new lines
      lines.splice(startLine, endLine - startLine + 1, ...newLines);
    }
  }

  return lines.join("\n");
}

/**
 * Validate that an operation is valid for the given content
 */
export function validateOperation(
  content: string,
  operation: TextOperation
): boolean {
  const lines = content.split("\n");
  const { range } = operation;

  // Check line bounds
  if (range.startLineNumber < 1 || range.startLineNumber > lines.length) {
    return false;
  }
  if (range.endLineNumber < 1 || range.endLineNumber > lines.length) {
    return false;
  }

  // Check column bounds
  const startLine = lines[range.startLineNumber - 1];
  const endLine = lines[range.endLineNumber - 1];

  if (range.startColumn < 1 || range.startColumn > startLine.length + 1) {
    return false;
  }
  if (range.endColumn < 1 || range.endColumn > endLine.length + 1) {
    return false;
  }

  return true;
}

/**
 * Create a simple operational transformation context
 */
export class OTContext {
  private operations: TextOperation[] = [];
  private version = 0;

  addOperation(operation: TextOperation): void {
    this.operations.push(operation);
    this.version++;
  }

  transformAgainstHistory(
    operations: TextOperation[],
    fromVersion: number
  ): TextOperation[] {
    const relevantOps = this.operations.slice(fromVersion);
    return transformOperations(operations, relevantOps);
  }

  getVersion(): number {
    return this.version;
  }

  getOperations(): TextOperation[] {
    return [...this.operations];
  }
}
