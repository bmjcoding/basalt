# Third-party code

## elkjs

`@srasyndicate/basalt/diagram-layout` (automatic diagram layout, DECISIONS 306, 1.8) imports [elkjs](https://github.com/kieler/elkjs) 0.12.1,
the Eclipse Layout Kernel compiled to JavaScript, unmodified. elkjs is a dependency of this package and is not copied into it.

- Licence: EPL-2.0 OR GPL-3.0-or-later. Basalt uses it under the Eclipse Public License 2.0 (https://www.eclipse.org/legal/epl-2.0/).
- Source: https://github.com/kieler/elkjs (the Eclipse Layout Kernel's own source: https://github.com/eclipse/elk).
- It is loaded only when an automatic figure has no `placement`. An app or page that places at build time with `placeDiagram` and passes `placement`
  ships none of it. An app whose browser bundle holds elkjs distributes it, and owes its notice and a pointer to its source.
