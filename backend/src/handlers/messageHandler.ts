/**
 * Interface for all message handlers
 */
export interface MessageHandler {
    /**
     * Handles a message of a specific type
     * @param message The message data to process
     */
    handleMessage(message: any): Promise<void>;
}
