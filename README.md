# opencode-model-instructions

[日本語](README.ja.md)

An OpenCode plugin that applies instruction files only when the active provider and model match configured rules.

OpenCode's built-in `instructions` setting is global. This plugin adds model-aware behavior, including sessions where you switch the model without switching the agent.

## Features

- Matches the provider and model resolved for each turn.
- Supports model changes during an existing session.
- Handles instruction files already loaded by OpenCode and removes them from non-matching models.
- Supports multiple model-to-instruction rules.
- Reads instruction files on each matching turn, so saved changes are picked up without reinstalling the plugin.
- Works without publishing or installing an npm package.

## Requirements

- OpenCode with the `experimental.chat.system.transform` plugin hook.
- Bun, which is included with standard OpenCode installations.
- A local clone of this repository.

## Installation

Clone the repository to a stable location:

```sh
git clone https://github.com/shirafukayayoi/opencode-model-instructions.git
```

Add the plugin and its rules to `opencode.jsonc`:

```jsonc
{
  "plugin": [
    [
      "file:///C:/path/to/opencode-model-instructions/src/index.ts",
      {
        "rules": [
          {
            "providerID": "openai",
            "modelID": "gpt-5.6-sol",
            "instructionPath": "C:\\path\\to\\SOL_AGENTS.md"
          }
        ]
      }
    ]
  ]
}
```

On macOS or Linux, use paths such as:

```jsonc
{
  "plugin": [
    [
      "file:///home/you/tools/opencode-model-instructions/src/index.ts",
      {
        "rules": [
          {
            "providerID": "openai",
            "modelID": "gpt-5.6-sol",
            "instructionPath": "~/instructions/SOL_AGENTS.md"
          }
        ]
      }
    ]
  ]
}
```

Restart OpenCode after changing the plugin configuration.

## Configuration

Each rule requires three fields:

| Field | Description |
| --- | --- |
| `providerID` | Exact OpenCode provider ID, such as `openai` |
| `modelID` | Exact OpenCode model ID, such as `gpt-5.6-sol` |
| `instructionPath` | Absolute path, `file://` URL, or path beginning with `~/` |

Rules use exact, case-sensitive provider and model matching. If several matching rules reference the same instruction file, that file is injected only once.

To find the IDs OpenCode resolved, inspect your configuration with:

```sh
opencode debug config
```

## Existing global instructions

You can remove model-specific files from the global `instructions` array. If the same file is still loaded globally or discovered as an `AGENTS.md`, the plugin removes that copy and restores it only for matching models.

Unrelated global and project instructions are left unchanged.

## Updating

Run the following command inside the cloned repository:

```sh
git pull --ff-only
```

Restart OpenCode after updating the plugin.

## Development

Run the test suite with:

```sh
bun test
```

## Compatibility

This plugin uses OpenCode's experimental `experimental.chat.system.transform` hook. A future OpenCode release may change that API.

## License

[MIT](LICENSE)
