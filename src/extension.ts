import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	vscode.languages.registerDocumentFormattingEditProvider('scala-collections', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			const firstLine = document.lineAt(0);

			var textEditActions = [];

			for (var lineNo = 0; lineNo < document.lineCount; lineNo++) {

				const lineText = document.lineAt(lineNo).text;

				const lineCharacters = lineText.split('');

				const stringBorders: [number, number][] = lineCharacters
					.reduce<number[]>((borders, char, index, arr) => {
						if (char === '"') {
							return [...borders, index];
						} else {
							return borders;
						};
					}, [])
					.reduce<[[number, number][], number | null]>(([borders, buffer], cur) => {
						if (!!buffer) {
							return [[...borders, [buffer, cur]], null];
						} else {
							return [borders, cur];
						}
					}, [[], null])[0];

				const containedInString = (index: number) => {
					return stringBorders.some(([start, end]) => {
						return start <= index && index < end;
					});
				};

				const findFirstOccurrenceNotInString = (text: String) => lineCharacters.map((char, index) => {
					if (char === text && !containedInString(index)) {
						return [index];
					} else {
						return [];
					}
				}).reduce((acc, val) => acc.concat(val), []);

				const openingBracketsNotInString = findFirstOccurrenceNotInString('(');

				const spacesNotInString = findFirstOccurrenceNotInString(' ');

				const didNotMatchString = "did not contain the same elements as ";

				const didNotMatchStringIndex = lineText.indexOf(didNotMatchString);

				const firstOpeningBracketNotInString = openingBracketsNotInString[0];

				const firstOpeningBracketAfterDidNotMatch = openingBracketsNotInString
					.filter(index => (index > didNotMatchStringIndex))[0];

				if (firstOpeningBracketNotInString >= 0) {
					textEditActions.push(
						vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketNotInString + 1), '\n\t')
					);
				}

				if (firstOpeningBracketAfterDidNotMatch >= 0) {
					textEditActions.push(
						vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketAfterDidNotMatch + 1), '\n\t')
					);
				}

				spacesNotInString
					.filter(index => {
						return index < didNotMatchStringIndex || index > didNotMatchStringIndex + didNotMatchString.length;
					})
					.forEach(index => {
						textEditActions.push(
							vscode.TextEdit.insert(new vscode.Position(lineNo, index + 1), '\n\t')
						);
					});

				if (didNotMatchStringIndex >= 0) {
					textEditActions.push(
						vscode.TextEdit.insert(new vscode.Position(lineNo, didNotMatchStringIndex), '\n\n')
					);

					textEditActions.push(
						vscode.TextEdit.insert(new vscode.Position(lineNo, didNotMatchStringIndex + didNotMatchString.length), '\n\n')
					);
				}
			}

			return textEditActions;
		}
	});
}

export function deactivate() { }
