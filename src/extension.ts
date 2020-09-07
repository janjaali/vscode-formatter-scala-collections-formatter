import * as vscode from 'vscode';

type DocumentLine = {
	text: string,
	lineNumber: number
};

function getDocumentLines(document: vscode.TextDocument): DocumentLine[] {

	return [...Array(document.lineCount).keys()].map(lineNumber => {

		return {
			text: document.lineAt(lineNumber).text,
			lineNumber: lineNumber,
		};
	});
}

function createInsertNewLineAction(lineNumber: number, position: number): vscode.TextEdit {
	return vscode.TextEdit.insert(new vscode.Position(lineNumber, position), '\n');
}

function createInsertNewTabAction(lineNumber: number, position: number): vscode.TextEdit {
	return vscode.TextEdit.insert(new vscode.Position(lineNumber, position), '\t');
}

function characterPositionsNotInAString(char: String, text: String) {

	const characters = text.split('');

	const stringPositionIndices = characters
		.flatMap((char, index) => {
			return char === '"' ? [index] : [];
		})
		.reduce<[[number, number][], number | null]>(([stringPositionIndices, buffer], quotationMarkPosition) => {

			return !!buffer
				? [[...stringPositionIndices, [buffer, quotationMarkPosition]], null]
				: [stringPositionIndices, quotationMarkPosition];
		}, [[], null])[0];

	const characterPositionContainedInAString = (index: number) => {
		return stringPositionIndices.some(([start, end]) =>
			start <= index && index < end
		);
	};

	return characters.flatMap((c, index) =>
		c === char && !characterPositionContainedInAString(index)
			? [index]
			: []
	);
}

function getTextEditActions(documentLines: DocumentLine[]): vscode.TextEdit[] {

	function getTextEditActions(documentLine: DocumentLine): vscode.TextEdit[] {

		const text = documentLine.text;

		const openingBracketPositionsNotInAString = characterPositionsNotInAString('(', documentLine.text);

		const firstOpeningBracketNotInString = openingBracketPositionsNotInAString[0];

		var editActions: vscode.TextEdit[] = [];

		if (!!firstOpeningBracketNotInString) {

			const insertNewLineAfterBracket = createInsertNewLineAction(documentLine.lineNumber, firstOpeningBracketNotInString + 1);
			const insertTabInNewLine = createInsertNewTabAction(documentLine.lineNumber, firstOpeningBracketNotInString + 1);

			editActions = [...editActions, insertNewLineAfterBracket, insertTabInNewLine];
		}

		const didNotMatchString = "did not contain the same elements as ";
		const didNotMatchStringStartIndex = text.indexOf(didNotMatchString);

		const firstOpeningBracketAfterDidNotMatch = openingBracketPositionsNotInAString
			.find(index => index > didNotMatchStringStartIndex);

		if (!!firstOpeningBracketAfterDidNotMatch) {

			const insertNewLineAfterBracket = createInsertNewLineAction(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1);
			const insertTabInNewLine = createInsertNewTabAction(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1);

			editActions = [...editActions, insertNewLineAfterBracket, insertTabInNewLine];
		}

		const spacePositionsNotInAString = characterPositionsNotInAString(' ', documentLine.text);

		spacePositionsNotInAString
			.filter(index =>
				(index < didNotMatchStringStartIndex) || (index > didNotMatchStringStartIndex + didNotMatchString.length)
			)
			.forEach(index => {

				const insertNewLine = createInsertNewLineAction(documentLine.lineNumber, index + 1);
				const insertTabInNewLine = createInsertNewTabAction(documentLine.lineNumber, index + 1);

				editActions = [...editActions, insertNewLine, insertTabInNewLine];
			});

		if (didNotMatchStringStartIndex >= 0) {

			const insertTwoNewLinesBefore = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, didNotMatchStringStartIndex), '\n\n');
			const insertTwoNewLinesAfter = vscode.TextEdit.insert(new vscode.Position(documentLine.lineNumber, didNotMatchStringStartIndex + didNotMatchString.length), '\n\n');

			editActions = [...editActions, insertTwoNewLinesBefore, insertTwoNewLinesAfter];
		}

		return editActions;
	}

	return documentLines.flatMap(documentLine => getTextEditActions(documentLine));
}

export function activate() {

	vscode.languages.registerDocumentFormattingEditProvider('scala-collections', {

		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

			const documentLines: DocumentLine[] = getDocumentLines(document);

			const textEditActions = getTextEditActions(documentLines);

			return textEditActions;
		}
	});
}

export function deactivate() { }
