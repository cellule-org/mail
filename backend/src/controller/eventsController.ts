import { MessageHandler } from "../handlers";

export class EventsController {
    private functionMap: Map<string, MessageHandler> = new Map();

    /**
     * Assigns a function to a string key
     * @param key The string key to associate with the function
     * @param fn The function to be stored
     */
    assignFunction(key: string, fn: MessageHandler): void {
        this.functionMap.set(key, fn);
    }

    /**
     * Retrieves a function by its string key
     * @param key The string key associated with the function
     * @returns The function associated with the key, or undefined if not found
     */
    getFunction(key: string): MessageHandler | undefined {
        return this.functionMap.get(key);
    }

    /**
     * Calls the function associated with the given key
     * @param key The string key of the function to call
     * @param message The message data to pass to the function
     */
    async call(key: string, message: any): Promise<void> {
        await this.functionMap.get(key)!.handleMessage(message);
    }


    /**
     * Checks if a function exists for the given key
     * @param key The string key to check
     * @returns true if a function exists for the key, false otherwise
     */
    has(key: string): boolean {
        return this.functionMap.has(key);
    }

    /**
     * Removes a function associated with the given key
     * @param key The string key of the function to remove
     * @returns true if the function was removed, false if the key wasn't found
     */
    removeFunction(key: string): boolean {
        return this.functionMap.delete(key);
    }
}