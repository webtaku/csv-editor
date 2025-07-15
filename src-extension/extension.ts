import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			'webtaku-csv.editor',
			new WebtakuCsvEditorProvider(context),
			{
				webviewOptions: { retainContextWhenHidden: true },
				supportsMultipleEditorsPerDocument: false
			}
		)
	);
}

class WebtakuCsvEditorProvider implements vscode.CustomTextEditorProvider {
	constructor(private readonly context: vscode.ExtensionContext) { }

	async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};

		this.updateWebview(webviewPanel);

		let isApplyingEdit = false;

		const updateWebviewData = () => {
			if (!isApplyingEdit) {
				webviewPanel.webview.postMessage({ type: 'csv-data', data: document.getText().trim() });
			}
		};

		webviewPanel.webview.onDidReceiveMessage(async (message) => {
			if (message.type === 'ready') {
				updateWebviewData();
			}

			if (message.type === 'edit') {
				isApplyingEdit = true;
				const edit = new vscode.WorkspaceEdit();
				const fullRange = new vscode.Range(
					0, 0,
					document.lineCount,
					document.lineAt(document.lineCount - 1).text.length
				);
				edit.replace(document.uri, fullRange, message.data);
				await vscode.workspace.applyEdit(edit);
				isApplyingEdit = false;
			}

			if (message.type === 'save') {
				await document.save();
			}

			if (message.type === 'open-text-editor') {
				await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
			}
		});

		const changeDocSub = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebviewData();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeDocSub.dispose();
		});
	}

	private updateWebview(webviewPanel: vscode.WebviewPanel) {
		const webview = webviewPanel.webview;

		const html = this.getHtml(webview);
		webview.html = html;
	}

	private getHtml(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'editor.js')
		);
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<style>
		.tabulator-cell {
			min-height: 25px;
		}
	</style>
</head>
<body>
	<div id="app"></div>
	<script src="${scriptUri}"></script>
</body>
</html>`;
	}
}
