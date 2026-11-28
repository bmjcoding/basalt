#!/usr/bin/env node
// basalt-lint (DECISIONS 404): Basalt's opt-in consumer lint. An app runs it in its own lint; see docs/consumer-lint.md.
//   basalt-lint [paths or globs...] [--config basalt-lint.config.json] [--format text|json] [--no-css] [--quiet] [--max-warnings <n>]
import { main } from "../lint/run.mjs";

process.exitCode = await main(process.argv.slice(2));
