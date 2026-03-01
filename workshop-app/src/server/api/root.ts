import { activityRouter } from "workshop/server/api/routers/activity";
import { commentRouter } from "workshop/server/api/routers/comment";
import { documentRouter } from "workshop/server/api/routers/document";
import { userRouter } from "workshop/server/api/routers/user";
import {
  createCallerFactory,
  createTRPCRouter,
} from "workshop/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  activity: activityRouter,
  document: documentRouter,
  comment: commentRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const docs = await trpc.document.listMine();
 */
export const createCaller = createCallerFactory(appRouter);
