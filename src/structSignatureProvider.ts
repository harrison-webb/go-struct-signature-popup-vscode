import * as vscode from 'vscode';
import { GoAnalyzer, StructInfo, FieldInfo } from './goAnalyzer';

export class GoStructSignatureProvider implements vscode.SignatureHelpProvider {
    private analyzer: GoAnalyzer;

    constructor() {
        this.analyzer = new GoAnalyzer();
    }

    async provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): Promise<vscode.SignatureHelp | undefined> {

        // Check if we're inside a struct literal
        const structContext = this.analyzer.findStructLiteralContext(document, position);
        if (!structContext) {
            return undefined;
        }

        // Get struct information from gopls via hover
        const structInfo = await this.analyzer.getStructInfo(
            document,
            structContext.typePosition,
            token
        );

        if (!structInfo) {
            return undefined;
        }

        // Build signature help
        return this.buildSignatureHelp(structInfo, structContext.activeFieldIndex);
    }

    private buildSignatureHelp(structInfo: StructInfo, activeFieldIndex: number): vscode.SignatureHelp {
        const signatureHelp = new vscode.SignatureHelp();

        // Build the signature label showing all fields
        const fieldLabels = structInfo.fields.map((f: FieldInfo) => `${f.name} ${f.type}`);
        const signatureLabel = `${structInfo.name}{${fieldLabels.join(', ')}}`;

        const signature = new vscode.SignatureInformation(signatureLabel);

        // Add documentation if available
        if (structInfo.documentation) {
            signature.documentation = new vscode.MarkdownString(structInfo.documentation);
        }

        // Add parameter information for each field
        let currentOffset = structInfo.name.length + 1; // After "StructName{"

        for (const field of structInfo.fields) {
            const fieldLabel = `${field.name} ${field.type}`;
            const param = new vscode.ParameterInformation(
                [currentOffset, currentOffset + fieldLabel.length],
                field.documentation ? new vscode.MarkdownString(field.documentation) : undefined
            );
            signature.parameters.push(param);
            currentOffset += fieldLabel.length + 2; // +2 for ", "
        }

        signatureHelp.signatures = [signature];
        signatureHelp.activeSignature = 0;
        signatureHelp.activeParameter = Math.min(activeFieldIndex, structInfo.fields.length - 1);

        return signatureHelp;
    }
}
