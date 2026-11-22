// A module with no semicolons whose first statement is a type (test/bundle.test.mjs): the import below it must still be read, through a real build.
export type Local = { id: string }
import { Table } from "@srasyndicate/basalt"
export const parts: unknown[] = [Table]
