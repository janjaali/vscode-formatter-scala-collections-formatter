import * as vscode from 'vscode';

type DocumentLine = {
	text: string,
	lineNumber: number
};

export function activate() {

	vscode.languages.registerDocumentFormattingEditProvider('scala-collections', {

		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

			const documentLines: DocumentLine[] = [...Array(document.lineCount).keys()].map(lineNumber => {

				return {
					text: document.lineAt(lineNumber).text,
					lineNumber: lineNumber,
				};
			});

			const textEditActions = documentLines.reduce<vscode.TextEdit[]>((editActions, documentLine) => {

				const lineText = documentLine.text;

				const lineCharacters = lineText.split('');

				const stringBorders: [number, number][] = lineCharacters
					.reduce<number[]>((borders, char, index) => {
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

				var actions: vscode.TextEdit[] = [];

				if (firstOpeningBracketNotInString >= 0) {

					const insertNewLineAfterBracket = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, firstOpeningBracketNotInString + 1), '\n');
					const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, firstOpeningBracketNotInString + 1), '\t');

					actions = [...actions, insertNewLineAfterBracket, insertTabInNewLine];
				}

				if (firstOpeningBracketAfterDidNotMatch >= 0) {

					const insertNewLineAfterBracket = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1), '\n');
					const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1), '\t');

					actions = [...actions, insertNewLineAfterBracket, insertTabInNewLine];
				}

				spacesNotInString
					.filter(index => {
						return index < didNotMatchStringIndex || index > didNotMatchStringIndex + didNotMatchString.length;
					})
					.forEach(index => {

						const insertNewLine = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, index + 1), '\n');
						const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, index + 1), '\t');

						actions = [...actions, insertNewLine, insertTabInNewLine];
					});

				if (didNotMatchStringIndex >= 0) {

					const insertTwoNewLinesBefore = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, didNotMatchStringIndex), '\n\n');
					const insertTwoNewLinesAfter = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, didNotMatchStringIndex + didNotMatchString.length), '\n\n');

					actions = [...actions, insertTwoNewLinesBefore, insertTwoNewLinesAfter];
				}

				return [...editActions, ...actions];
			}, []);

			return textEditActions;
		}
	});
}

export function deactivate() { }
