export const redirect = (_url: string): never => {
  throw new Error('redirect: not supported in Storybook');
};

export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  refresh: () => {},
});

export const useSearchParams = () => new URLSearchParams();

export const usePathname = () => '/';
