import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import plugin from "../src/index"

describe("opencode-model-instructions", () => {
	let tempDirectory: string
	let instructionPath: string

	beforeAll(async () => {
		tempDirectory = await mkdtemp(path.join(os.tmpdir(), "opencode-model-instructions-"))
		instructionPath = path.join(tempDirectory, "AGENTS.md")
		await writeFile(instructionPath, "Apply only to the selected model.\n", "utf8")
	})

	afterAll(async () => {
		await rm(tempDirectory, { recursive: true, force: true })
	})

	test("injects instructions for a matching model", async () => {
		const hooks = await plugin({} as never, {
			rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath }],
		})
		const output = { system: ["Unrelated system prompt"] }

		await hooks["experimental.chat.system.transform"]?.(
			{ model: { providerID: "openai", id: "gpt-test" } } as never,
			output,
		)

		expect(output.system).toHaveLength(2)
		expect(output.system[1]).toContain(`Instructions from: ${instructionPath}`)
		expect(output.system[1]).toContain("Apply only to the selected model.")
	})

	test("removes configured instructions for a non-matching model", async () => {
		const hooks = await plugin({} as never, {
			rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath }],
		})
		const output = {
			system: [`Instructions from: ${instructionPath}\nPreviously loaded`, "Unrelated system prompt"],
		}

		await hooks["experimental.chat.system.transform"]?.(
			{ model: { providerID: "other", id: "other-model" } } as never,
			output,
		)

		expect(output.system).toEqual(["Unrelated system prompt"])
	})

	test("rejects missing rules", async () => {
		await expect(plugin({} as never, {})).rejects.toThrow("requires a non-empty rules array")
	})
})
