import * as vscode from 'vscode';

export interface FieldInfo {
    name: string;
    type: string;
    documentation?: string;
    tag?: string;
}

export interface StructInfo {
    name: string;
    fields: FieldInfo[];
    documentation?: string;
}

export interface StructLiteralContext {
    typeName: string;
    typePosition: vscode.Position;
    activeFieldIndex: number;
}

export class GoAnalyzer {

    /**
     * Finds if the cursor is inside a struct literal and returns context information
     */
    findStructLiteralContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): StructLiteralContext | undefined {
        const text = document.getText();
        const offset = document.offsetAt(position);

        // Find the opening brace that contains our position
        let braceDepth = 0;
        let openBraceOffset = -1;

        for (let i = offset - 1; i >= 0; i--) {
            const char = text[i];
            if (char === '}') {
                braceDepth++;
            } else if (char === '{') {
                if (braceDepth === 0) {
                    openBraceOffset = i;
                    break;
                }
                braceDepth--;
            }
        }

        if (openBraceOffset === -1) {
            return undefined;
        }

        // Look backwards from the opening brace to find the type name
        const textBeforeBrace = text.substring(0, openBraceOffset).trimEnd();

        // Match a type name (potentially with package prefix)
        // Patterns: TypeName, pkg.TypeName, &TypeName, &pkg.TypeName
        const typeMatch = textBeforeBrace.match(/(&?\s*)([A-Z_][a-zA-Z0-9_]*(?:\.[A-Z_][a-zA-Z0-9_]*)?)$/);

        if (!typeMatch) {
            return undefined;
        }

        const typeName = typeMatch[2];
        const typeStartOffset = textBeforeBrace.length - typeMatch[0].length + typeMatch[1].length;
        const typePosition = document.positionAt(typeStartOffset);

        // Count commas to determine active field index
        const textInsideBraces = text.substring(openBraceOffset + 1, offset);
        const activeFieldIndex = this.countActiveFieldIndex(textInsideBraces);

        return {
            typeName,
            typePosition,
            activeFieldIndex
        };
    }

    /**
     * Counts the active field index based on commas, accounting for nested braces and strings
     */
    private countActiveFieldIndex(text: string): number {
        let index = 0;
        let braceDepth = 0;
        let parenDepth = 0;
        let bracketDepth = 0;
        let inDoubleQuote = false;
        let inBacktick = false;
        let prevChar = '';

        for (const char of text) {
            // Handle string literals - ignore everything inside them
            if (char === '"' && !inBacktick && prevChar !== '\\') {
                inDoubleQuote = !inDoubleQuote;
            } else if (char === '`' && !inDoubleQuote) {
                inBacktick = !inBacktick;
            } else if (!inDoubleQuote && !inBacktick) {
                // Only process structural characters when not in a string
                if (char === '{') braceDepth++;
                else if (char === '}') braceDepth--;
                else if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
                else if (char === '[') bracketDepth++;
                else if (char === ']') bracketDepth--;
                else if (char === ',' && braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
                    index++;
                }
            }
            prevChar = char;
        }

        return index;
    }

    /**
     * Gets struct information using gopls via VSCode's hover provider
     */
    async getStructInfo(
        document: vscode.TextDocument,
        typePosition: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<StructInfo | undefined> {
        try {
            // Use VSCode's built-in hover command which triggers gopls
            const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
                'vscode.executeHoverProvider',
                document.uri,
                typePosition
            );

            if (!hovers || hovers.length === 0) {
                return undefined;
            }

            // Parse the hover content to extract struct information
            const hoverContent = this.extractHoverContent(hovers);
            if (!hoverContent) {
                return undefined;
            }

            return this.parseStructFromHover(hoverContent);
        } catch (error) {
            console.error('Error getting struct info:', error);
            return undefined;
        }
    }

    /**
     * Extracts text content from hover results
     */
    private extractHoverContent(hovers: vscode.Hover[]): string | undefined {
        for (const hover of hovers) {
            for (const content of hover.contents) {
                if (typeof content === 'string') {
                    return content;
                } else if (content instanceof vscode.MarkdownString) {
                    return content.value;
                } else if ('value' in content) {
                    return content.value;
                }
            }
        }
        return undefined;
    }

    /**
     * Parses struct definition from gopls hover content
     */
    private parseStructFromHover(content: string): StructInfo | undefined {
        // gopls hover format typically looks like:
        // ```go
        // type TypeName struct {
        //     Field1 Type1
        //     Field2 Type2 // comment
        // }
        // ```

        // Extract the code block content
        const codeBlockMatch = content.match(/```go\n([\s\S]*?)\n```/);
        const codeContent = codeBlockMatch ? codeBlockMatch[1] : content;

        // Match struct definition
        const structMatch = codeContent.match(/type\s+(\w+)\s+struct\s*\{([\s\S]*?)\}/);
        if (!structMatch) {
            // Try simpler pattern for inline hover
            return this.parseInlineStruct(codeContent);
        }

        const structName = structMatch[1];
        const fieldsBlock = structMatch[2];

        const fields = this.parseFields(fieldsBlock);

        // Extract documentation (text before the code block)
        const docMatch = content.match(/^([\s\S]*?)```/);
        const documentation = docMatch ? docMatch[1].trim() : undefined;

        return {
            name: structName,
            fields,
            documentation: documentation || undefined
        };
    }

    /**
     * Parses an inline struct definition
     */
    private parseInlineStruct(content: string): StructInfo | undefined {
        // Pattern for: TypeName struct { Field1 Type1; Field2 Type2 }
        const match = content.match(/(\w+)\s+struct\s*\{([^}]*)\}/);
        if (!match) {
            return undefined;
        }

        const fields = this.parseFields(match[2]);
        return {
            name: match[1],
            fields
        };
    }

    /**
     * Parses field definitions from struct body
     */
    private parseFields(fieldsBlock: string): FieldInfo[] {
        const fields: FieldInfo[] = [];
        const lines = fieldsBlock.split(/[;\n]/).map(l => l.trim()).filter(l => l);

        for (const line of lines) {
            // Skip empty lines and embedded types for now
            if (!line || line.startsWith('//')) continue;

            // Match: FieldName Type `tag` // comment
            // or: FieldName Type // comment
            // or: FieldName Type
            const fieldMatch = line.match(/^(\w+)\s+([^`\/\n]+?)(?:\s+`([^`]*)`)?(?:\s*\/\/\s*(.*))?$/);

            if (fieldMatch) {
                fields.push({
                    name: fieldMatch[1],
                    type: fieldMatch[2].trim(),
                    tag: fieldMatch[3],
                    documentation: fieldMatch[4]
                });
            }
        }

        return fields;
    }
}
