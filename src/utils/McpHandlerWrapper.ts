import { BaseError } from "../errors/AppErrors.js";

/**
 * Wraps an MCP Tool handler with consistent error handling and logging.
 */
export function wrapToolHandler<T = any>(
    handler: (args: T) => Promise<{ content: any[]; structuredContent?: any; isError?: boolean }>
) {
    return async (args: T) => {
        try {
            return await handler(args);
        } catch (error: any) {
            const isAppError = error instanceof BaseError;
            const message = error.message || 'An unexpected error occurred';
            const details = isAppError ? error.details : undefined;

            // Log to stderr for server diagnostics
            console.error(`[Tool Error] ${error.name || 'Error'}: ${message}`, details || '');
            if (!isAppError) {
                console.error(error.stack);
            }

            return {
                content: [{
                    type: "text",
                    text: `Error: ${message}${details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : ''}`
                }],
                isError: true
            };
        }
    };
}

/**
 * Wraps an MCP Resource handler with consistent error handling.
 */
export function wrapResourceHandler(
    handler: (uri: URL, args: any) => Promise<{ contents: any[]; metadata?: any }>
) {
    return async (uri: URL, args: any) => {
        try {
            return await handler(uri, args);
        } catch (error: any) {
            const isAppError = error instanceof BaseError;
            const message = error.message || 'An unexpected error occurred';

            console.error(`[Resource Error] ${uri.href}: ${message}`);
            if (!isAppError) {
                console.error(error.stack);
            }

            // Resources typically throw to the SDK, which handles the error response
            // We re-throw to ensure the SDK gets the error, but we've logged it
            throw error;
        }
    };
}
/**
 * Wraps an MCP Prompt handler with consistent error handling.
 */
export function wrapPromptHandler(
    handler: (args: any) => Promise<{ messages: any[] }>
) {
    return async (args: any) => {
        try {
            return await handler(args);
        } catch (error: any) {
            const isAppError = error instanceof BaseError;
            const message = error.message || 'An unexpected error occurred';

            console.error(`[Prompt Error]: ${message}`);
            if (!isAppError) {
                console.error(error.stack);
            }

            throw error;
        }
    };
}
