import * as vscode from 'vscode';

export function activate() {

	vscode.languages.registerDocumentFormattingEditProvider('scala-collections', {

		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

			const numberOfLines = [...Array(document.lineCount).keys()];

			const textEditActions = numberOfLines.reduce<vscode.TextEdit[]>((editActions, lineNo) => {

				const lineText = document.lineAt(lineNo).text;

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

					const insertNewLineAfterBracket = vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketNotInString + 1), '\n');
					const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketNotInString + 1), '\t');

					actions = [...actions, insertNewLineAfterBracket, insertTabInNewLine];
				}

				if (firstOpeningBracketAfterDidNotMatch >= 0) {

					const insertNewLineAfterBracket = vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketAfterDidNotMatch + 1), '\n');
					const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(lineNo, firstOpeningBracketAfterDidNotMatch + 1), '\t');

					actions = [...actions, insertNewLineAfterBracket, insertTabInNewLine];
				}

				spacesNotInString
					.filter(index => {
						return index < didNotMatchStringIndex || index > didNotMatchStringIndex + didNotMatchString.length;
					})
					.forEach(index => {

						const insertNewLine = vscode.TextEdit.insert(new vscode.Position(lineNo, index + 1), '\n');
						const insertTabInNewLine = vscode.TextEdit.insert(new vscode.Position(lineNo, index + 1), '\t');

						actions = [...actions, insertNewLine, insertTabInNewLine];
					});

				if (didNotMatchStringIndex >= 0) {

					const insertTwoNewLinesBefore = vscode.TextEdit.insert(new vscode.Position(lineNo, didNotMatchStringIndex), '\n\n');
					const insertTwoNewLinesAfter = vscode.TextEdit.insert(new vscode.Position(lineNo, didNotMatchStringIndex + didNotMatchString.length), '\n\n');
					
					actions = [...actions, insertTwoNewLinesBefore, insertTwoNewLinesAfter];
				}

				return [...editActions, ...actions];
			}, []);

			return textEditActions;
		}
	});
}

export function deactivate() { }
