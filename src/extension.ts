import * as vscode from 'vscode';
import { GoStructSignatureProvider } from './structSignatureProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Go Struct Signature Helper is now active');

    // Register the signature help provider for Go files
    const provider = new GoStructSignatureProvider();

    const disposable = vscode.languages.registerSignatureHelpProvider(
        { language: 'go', scheme: 'file' },
        provider,
        '{', ',', '\n'  // Trigger on opening brace, comma, and newline
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }
