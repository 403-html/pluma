import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: { params: Promise<{ mdxPath: string[] }> }) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath)
  return metadata
}

// eslint-disable-next-line react-hooks/rules-of-hooks -- useMDXComponents is a Nextra v4 module-level registry, not a React hook
const Wrapper = useMDXComponents().wrapper

export default async function Page(props: { params: Promise<{ mdxPath: string[] }> }) {
  const params = await props.params
  const result = await importPage(params.mdxPath)
  const { default: MDXContent, ...rest } = result
  return (
    <Wrapper {...rest}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
