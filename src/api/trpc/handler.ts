import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/index';

export const config = {
  runtime: 'edge',
};

export const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export default handler;

