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

	test("matches provider and model IDs exactly and case-sensitively", async () => {
		const hooks = await plugin({} as never, {
			rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath }],
		})
		const output = { system: ["Unrelated system prompt"] }

		await hooks["experimental.chat.system.transform"]?.(
			{ model: { providerID: "OpenAI", id: "gpt-test" } } as never,
			output,
		)

		expect(output.system).toEqual(["Unrelated system prompt"])
	})

	test("injects a duplicated instruction path only once", async () => {
		const rule = { providerID: "openai", modelID: "gpt-test", instructionPath }
		const hooks = await plugin({} as never, { rules: [rule, rule] })
		const output = { system: [] as string[] }

		await hooks["experimental.chat.system.transform"]?.(
			{ model: { providerID: "openai", id: "gpt-test" } } as never,
			output,
		)

		expect(output.system).toHaveLength(1)
	})

	test("reads updated instruction content on every matching turn", async () => {
		const hooks = await plugin({} as never, {
			rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath }],
		})
		const hook = hooks["experimental.chat.system.transform"]
		const first = { system: [] as string[] }
		await hook?.({ model: { providerID: "openai", id: "gpt-test" } } as never, first)

		await writeFile(instructionPath, "Updated instructions.\n", "utf8")
		const second = { system: [] as string[] }
		await hook?.({ model: { providerID: "openai", id: "gpt-test" } } as never, second)

		expect(first.system[0]).toContain("Apply only to the selected model.")
		expect(second.system[0]).toContain("Updated instructions.")
	})

	test("warns and continues when a matching instruction file cannot be read", async () => {
		const missingPath = path.join(tempDirectory, "missing.md")
		const hooks = await plugin({} as never, {
			rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath: missingPath }],
		})
		const output = { system: ["Unrelated system prompt"] }
		const warnings: string[] = []
		const originalWarn = console.warn
		console.warn = (...values: unknown[]) => warnings.push(values.map(String).join(" "))

		try {
			await hooks["experimental.chat.system.transform"]?.(
				{ model: { providerID: "openai", id: "gpt-test" } } as never,
				output,
			)
		} finally {
			console.warn = originalWarn
		}

		expect(output.system).toEqual(["Unrelated system prompt"])
		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain(missingPath)
		expect(warnings[0]).toContain("openai/gpt-test")
	})

	test("rejects missing rules", async () => {
		await expect(plugin({} as never, {})).rejects.toThrow("requires a non-empty rules array")
	})

	test("rejects relative instruction paths", async () => {
		await expect(
			plugin({} as never, {
				rules: [{ providerID: "openai", modelID: "gpt-test", instructionPath: "AGENTS.md" }],
			}),
		).rejects.toThrow("instructionPath must be absolute")
	})
})
