import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin, PluginOptions } from "@opencode-ai/plugin"

type Rule = {
	providerID: string
	modelID: string
	instructionPath: string
}

type ResolvedRule = Rule & {
	resolvedPath: string
	pathKey: string
}

const instructionPrefix = "Instructions from: "

function pathKey(value: string): string {
	const resolved = path.resolve(value)
	return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

function resolveInstructionPath(value: string): string {
	if (value.startsWith("file://")) return path.resolve(fileURLToPath(value))
	if (value === "~") return os.homedir()
	if (value.startsWith("~/") || value.startsWith("~\\")) {
		return path.resolve(os.homedir(), value.slice(2))
	}
	if (!path.isAbsolute(value)) {
		throw new Error(`instructionPath must be absolute, a file URL, or start with ~/: ${value}`)
	}
	return path.resolve(value)
}

function parseRules(options: PluginOptions | undefined): ResolvedRule[] {
	if (!Array.isArray(options?.rules) || options.rules.length === 0) {
		throw new Error("opencode-model-instructions requires a non-empty rules array")
	}

	return options.rules.map((value, index) => {
		if (!value || typeof value !== "object") throw new Error(`rules[${index}] must be an object`)

		const rule = value as Partial<Rule>
		for (const key of ["providerID", "modelID", "instructionPath"] as const) {
			if (typeof rule[key] !== "string" || rule[key].length === 0) {
				throw new Error(`rules[${index}].${key} must be a non-empty string`)
			}
		}

		const resolvedPath = resolveInstructionPath(rule.instructionPath as string)
		return {
			providerID: rule.providerID as string,
			modelID: rule.modelID as string,
			instructionPath: rule.instructionPath as string,
			resolvedPath,
			pathKey: pathKey(resolvedPath),
		}
	})
}

function sourcePathKey(value: string): string | undefined {
	const firstLine = value.split("\n", 1)[0]
	if (!firstLine.startsWith(instructionPrefix)) return undefined

	const source = firstLine.slice(instructionPrefix.length)
	if (!path.isAbsolute(source)) return undefined
	return pathKey(source)
}

const ModelInstructionsPlugin: Plugin = async (_input, options) => {
	const rules = parseRules(options)
	const configuredPaths = new Set(rules.map((rule) => rule.pathKey))

	return {
		"experimental.chat.system.transform": async (input, output) => {
			output.system = output.system.filter((item) => {
				const source = sourcePathKey(item)
				return !source || !configuredPaths.has(source)
			})

			const matchedPaths = new Set<string>()
			for (const rule of rules) {
				if (rule.providerID !== input.model.providerID || rule.modelID !== input.model.id) continue
				if (matchedPaths.has(rule.pathKey)) continue
				matchedPaths.add(rule.pathKey)

				let content: string
				try {
					content = await readFile(rule.resolvedPath, "utf8")
				} catch (error) {
					const detail = error instanceof Error ? error.message : String(error)
					console.warn(
						`[opencode-model-instructions] Failed to read instruction file "${rule.resolvedPath}" for ${rule.providerID}/${rule.modelID}: ${detail}`,
					)
					continue
				}
				if (content.length > 0) {
					output.system.push(`${instructionPrefix}${rule.resolvedPath}\n${content}`)
				}
			}
		},
	}
}

export default ModelInstructionsPlugin
