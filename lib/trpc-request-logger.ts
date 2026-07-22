import { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AnyRouter } from "@trpc/server";

/**
 * Comprehensive tRPC request logging middleware
 * Logs every request with full details for debugging
 */
export const trpcRequestLoggerLink: TRPCLink<any> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const startTime = Date.now();
      const { type, path, input } = op;

      // Log outgoing request
      // console.log("[tRPC Request]", {
        // timestamp: new Date().toISOString(),
        // type,
        // path,
        // input: JSON.stringify(input, null, 2),
        // inputType: typeof input,
        // inputIsUndefined: input === undefined,
        // inputIsNull: input === null,
      // });

      return next(op).subscribe({
        next(result: any) {
          const duration = Date.now() - startTime;
          // console.log("[tRPC Response]", {
            // timestamp: new Date().toISOString(),
            // type,
            // path,
            // duration: `${duration}ms`,
            // resultType: result.type,
            // hasError: result.type === "error",
            // error: result.type === "error" ? result.error.message : undefined,
          // });
          observer.next(result);
        },
        error(error: any) {
          const duration = Date.now() - startTime;
          // console.log("[tRPC Error]", {
            // timestamp: new Date().toISOString(),
            // type,
            // path,
            // duration: `${duration}ms`,
            // error: error.message,
            // errorCode: error.code,
          // });
          observer.error(error);
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
};
