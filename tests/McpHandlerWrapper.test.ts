import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapToolHandler, wrapResourceHandler, wrapPromptHandler } from '../src/utils/McpHandlerWrapper.js';
import { BaseError, DatabaseError } from '../src/errors/AppErrors.js';

describe('McpHandlerWrapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console.error for cleaner test output
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('wrapToolHandler', () => {
        it('should return handler result on success', async () => {
            const mockHandler = vi.fn().mockResolvedValue({
                content: [{ type: 'text', text: 'Success' }],
                structuredContent: { data: 'test' }
            });

            const wrappedHandler = wrapToolHandler(mockHandler);
            const result = await wrappedHandler({ test: 'arg' });

            expect(result).toEqual({
                content: [{ type: 'text', text: 'Success' }],
                structuredContent: { data: 'test' }
            });
            expect(mockHandler).toHaveBeenCalledWith({ test: 'arg' });
        });

        it('should catch and format BaseError', async () => {
            const error = new DatabaseError('Connection failed', { host: 'localhost' });
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapToolHandler(mockHandler);
            const result = await wrappedHandler({ test: 'arg' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Connection failed');
            expect(console.error).toHaveBeenCalled();
        });

        it('should catch and format generic Error', async () => {
            const error = new Error('Unexpected error');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapToolHandler(mockHandler);
            const result = await wrappedHandler({ test: 'arg' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Unexpected error');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle non-Error objects', async () => {
            const mockHandler = vi.fn().mockRejectedValue('String error');

            const wrappedHandler = wrapToolHandler(mockHandler);
            const result = await wrappedHandler({ test: 'arg' });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('An unexpected error occurred');
        });

        it('should log errors to stderr', async () => {
            const error = new Error('Test error');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapToolHandler(mockHandler);
            await wrappedHandler({ test: 'arg' });

            // Verify console.error was called
            expect(console.error).toHaveBeenCalled();
            const errorCalls = (console.error as any).mock.calls;
            expect(errorCalls.length).toBeGreaterThan(0);
        });
    });

    describe('wrapResourceHandler', () => {
        it('should return handler result on success', async () => {
            const mockHandler = vi.fn().mockResolvedValue({
                contents: [{ uri: 'test://resource', mimeType: 'application/json', text: '{}' }]
            });

            const wrappedHandler = wrapResourceHandler(mockHandler);
            const mockUri = new URL('test://resource');
            const result = await wrappedHandler(mockUri, { arg: 'value' });

            expect(result).toEqual({
                contents: [{ uri: 'test://resource', mimeType: 'application/json', text: '{}' }]
            });
            expect(mockHandler).toHaveBeenCalledWith(mockUri, { arg: 'value' });
        });

        it('should log and re-throw errors', async () => {
            const error = new DatabaseError('Resource not found');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapResourceHandler(mockHandler);
            const mockUri = new URL('test://resource');

            await expect(wrappedHandler(mockUri, {})).rejects.toThrow('Resource not found');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle generic errors', async () => {
            const error = new Error('Generic error');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapResourceHandler(mockHandler);
            const mockUri = new URL('test://resource');

            await expect(wrappedHandler(mockUri, {})).rejects.toThrow('Generic error');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('wrapPromptHandler', () => {
        it('should return handler result on success', async () => {
            const mockHandler = vi.fn().mockResolvedValue({
                messages: [{ role: 'user', content: { type: 'text', text: 'Test prompt' } }]
            });

            const wrappedHandler = wrapPromptHandler(mockHandler);
            const result = await wrappedHandler({ arg: 'value' });

            expect(result).toEqual({
                messages: [{ role: 'user', content: { type: 'text', text: 'Test prompt' } }]
            });
            expect(mockHandler).toHaveBeenCalledWith({ arg: 'value' });
        });

        it('should log and re-throw errors', async () => {
            const error = new DatabaseError('Prompt generation failed');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapPromptHandler(mockHandler);

            await expect(wrappedHandler({ arg: 'value' })).rejects.toThrow('Prompt generation failed');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle non-BaseError exceptions', async () => {
            const error = new Error('Unexpected prompt error');
            const mockHandler = vi.fn().mockRejectedValue(error);

            const wrappedHandler = wrapPromptHandler(mockHandler);

            await expect(wrappedHandler({ arg: 'value' })).rejects.toThrow('Unexpected prompt error');
            expect(console.error).toHaveBeenCalled();
        });
    });
});
