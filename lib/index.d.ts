/**
 * Dedupr main module.
 */
export declare class Dedupr {
    constructor(options: Options);
    /**
     * Program options.
     */
    options: Options;
    /**
     * Results of original files, hashes and their duplicates.
     */
    results: {
        [id: string]: FileResult;
    };
    /**
     * If running, when did the process start.
     */
    startTime: Date;
    /**
     * Start scanning the passed folders.
     */
    run: () => Promise<void>;
    /**
     * When the scanning has finished, delete duplicates (if set on options) and save to the output.
     */
    end: () => void;
    /**
     * Scan the specified folder and get its file list.
     * @param folder Folder to be scanned.
     */
    scanFolder: (folder: string) => Promise<void>;
    /**
     * Scan and generate a hash for the specified file.
     * @param filepath Full file path.
     */
    scanFile: (filepath: string) => Promise<void>;
    /**
     * Save the hash value for the specified file.
     * @param filepath Full file path.
     * @param hash Computed hash value.
     */
    processFile: (filepath: string, hash: string) => void;
}
export default Dedupr;
