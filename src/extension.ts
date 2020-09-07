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

class TextEditActionCreators {

	private static createInsertCharacterAction(character: string, lineNumber: number, position: number): vscode.TextEdit {
		return vscode.TextEdit.insert(new vscode.Position(lineNumber, position), character);
	}

	static createInsertNewLineAction(lineNumber: number, position: number): vscode.TextEdit {
		return TextEditActionCreators.createInsertCharacterAction('\n', lineNumber, position);
	}

	static createInsertTabAction(lineNumber: number, position: number): vscode.TextEdit {
		return TextEditActionCreators.createInsertCharacterAction('\t', lineNumber, position);
	}
};

function characterPositionsNotEscapedInAString(char: String, text: String) {

	const characters = text.split('');

	const quotationMarkPositions = characters.flatMap((char, index) =>
		char === '"' ? [index] : []
	);

	type StringBoundary = {
		start: number,
		end: number
	};

	const stringBoundaries = quotationMarkPositions
		.reduce<[StringBoundary[], number | null]>(([stringBoundaries, buffer], quotationMarkPosition) => {

			if (!!buffer) {

				const stringBoundary = { start: buffer, end: quotationMarkPosition };
				const emptyBuffer = null;
				return [[...stringBoundaries, stringBoundary], emptyBuffer];
			} else {

				const buffer = quotationMarkPosition;
				return [stringBoundaries, buffer];
			}
		}, [[], null])[0];

	const characterPositionContainedInAString = (index: number) => {
		return stringBoundaries.some(stringBoundary =>
			stringBoundary.start <= index && index < stringBoundary.end
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

		const openingBracketPositionsNotInAString = characterPositionsNotEscapedInAString('(', documentLine.text);

		const firstOpeningBracketNotInString = openingBracketPositionsNotInAString[0];

		const firstOpeningBracketActions = !!firstOpeningBracketNotInString
			? [
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, firstOpeningBracketNotInString + 1),
				TextEditActionCreators.createInsertTabAction(documentLine.lineNumber, firstOpeningBracketNotInString + 1),
			]
			: [];

		const didNotMatchString = "did not contain the same elements as ";
		const didNotMatchStringStartIndex = text.indexOf(didNotMatchString);

		const firstOpeningBracketAfterDidNotMatch = openingBracketPositionsNotInAString
			.find(index => index > didNotMatchStringStartIndex);

		const firstOpeningBracketAfterDidNotMatchActions = !!firstOpeningBracketAfterDidNotMatch
			? [
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1),
				TextEditActionCreators.createInsertTabAction(documentLine.lineNumber, firstOpeningBracketAfterDidNotMatch + 1),
			]
			: [];

		const spacePositionsNotInAString = characterPositionsNotEscapedInAString(' ', documentLine.text);

		const spaceActions = spacePositionsNotInAString
			.filter(index =>
				(index < didNotMatchStringStartIndex) || (index > didNotMatchStringStartIndex + didNotMatchString.length)
			)
			.flatMap(index => {

				const insertNewLine = TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, index + 1);
				const insertTabInNewLine = TextEditActionCreators.createInsertTabAction(documentLine.lineNumber, index + 1);

				return [insertNewLine, insertTabInNewLine];
			});

		const didNotMatchStringStartActions = !!didNotMatchStringStartIndex
			? [
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, didNotMatchStringStartIndex),
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, didNotMatchStringStartIndex),
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, didNotMatchStringStartIndex + didNotMatchString.length),
				TextEditActionCreators.createInsertNewLineAction(documentLine.lineNumber, didNotMatchStringStartIndex + didNotMatchString.length),
			]
			: [];

		return [
			firstOpeningBracketActions,
			firstOpeningBracketAfterDidNotMatchActions,
			spaceActions,
			didNotMatchStringStartActions,
		].flat();
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
