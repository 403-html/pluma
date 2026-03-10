import { useMDXComponents as getComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'nextra/mdx-components'

export function useMDXComponents(components?: MDXComponents) {
  return components ? getComponents(components) : getComponents()
}
