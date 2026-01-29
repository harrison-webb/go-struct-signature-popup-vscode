# Go Struct Signature Helper

A VSCode extension that provides signature help popups for Go struct literals, similar to function signature help.

## Features

When you type a struct literal in Go (e.g., `Person{`), this extension shows a popup displaying all fields with their types and documentation.


## Usage

1. Open a Go file
2. Start typing a struct literal: `MyStruct{`
3. A popup appears showing all fields
4. As you add fields, the popup highlights the current field

## Requirements

- [Go extension for VS Code](https://marketplace.visualstudio.com/items?itemName=golang.go) (provides gopls)

## Extension Settings

This extension contributes the following settings:

* `goStructSignature.showTypes`: Enable/disable showing field types (default: true)
* `goStructSignature.showDocumentation`: Enable/disable showing field documentation (default: true)

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch
```

Press F5 to launch the Extension Development Host for testing.

## License

MIT
