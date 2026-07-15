# opencode-model-instructions

[English](README.md)

有効なプロバイダーとモデルが設定ルールに一致した場合だけ、指定した指示ファイルを適用するOpenCodeプラグインです。

OpenCode標準の `instructions` は全モデル共通です。このプラグインを使うと、エージェントを変えずにモデルだけ切り替えた場合も含め、モデルごとに指示を出し分けられます。

## 機能

- 各ターンで実際に解決されたプロバイダーとモデルを判定します。
- 既存セッションの途中で行ったモデル変更にも対応します。
- OpenCodeがすでに読み込んだ指示ファイルを処理し、一致しないモデルから除外します。
- 複数のモデルと指示ファイルの組み合わせを設定できます。
- 一致するターンごとに指示ファイルを読み直すため、保存した変更を再インストールせず反映できます。
- npmへの公開やnpmパッケージのインストールは不要です。

## 必要環境

- `experimental.chat.system.transform` プラグインフックを備えたOpenCode
- Bun。標準的なOpenCode環境に同梱されています。
- このリポジトリのローカルclone

## 導入

安定した保存先へリポジトリをcloneします。

```sh
git clone https://github.com/shirafukayayoi/opencode-model-instructions.git
```

`opencode.jsonc` にプラグインとルールを追加します。

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

macOSまたはLinuxでは次のようなパスを使用します。

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

設定変更後はOpenCodeを再起動してください。

## 設定

各ルールには3つの項目が必要です。

| 項目 | 説明 |
| --- | --- |
| `providerID` | `openai` などの正確なOpenCodeプロバイダーID |
| `modelID` | `gpt-5.6-sol` などの正確なOpenCodeモデルID |
| `instructionPath` | 絶対パス、`file://` URL、または `~/` で始まるパス |

プロバイダーとモデルは大文字・小文字を区別して完全一致で判定されます。同じ指示ファイルを参照するルールが複数一致しても、そのファイルは一度だけ追加されます。

OpenCodeが解決したIDは次のコマンドで設定を確認できます。

```sh
opencode debug config
```

## 既存のグローバル指示

モデル専用ファイルはグローバルの `instructions` 配列から削除できます。同じファイルがグローバル設定に残っている場合や `AGENTS.md` として自動検出された場合でも、プラグインがそのコピーを除外し、一致するモデルにだけ追加し直します。

無関係なグローバル指示やプロジェクト指示は変更しません。

## 更新

cloneしたリポジトリ内で次のコマンドを実行します。

```sh
git pull --ff-only
```

更新後はOpenCodeを再起動してください。

## 開発

テストは次のコマンドで実行できます。

```sh
bun test
```

## 互換性

このプラグインはOpenCodeの実験的な `experimental.chat.system.transform` フックを使用します。将来のOpenCode更新でAPIが変更される可能性があります。

## ライセンス

[MIT](LICENSE)
