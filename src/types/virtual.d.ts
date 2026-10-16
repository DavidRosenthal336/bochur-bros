/**
 * The listing of art files actually present in `public/`, produced by the
 * `available-art` Vite plugin. See `vite.config.ts`.
 */
declare module 'virtual:available-art' {
  export const AVAILABLE_ART: ReadonlySet<string>;
}

/** The art pipeline's index: see vite.config.ts and scripts/process-assets.mjs. */
declare module 'virtual:processed-art' {
  export const PROCESSED: {
    readonly scale: number;
    readonly atlases: Readonly<Record<string, { readonly image: string; readonly data: string }>>;
    readonly entries: Readonly<
      Record<
        string,
        {
          readonly atlas?: string;
          readonly frame?: string;
          readonly file?: string;
          readonly frameWidth?: number;
          readonly frameHeight?: number;
          readonly frames?: number;
        }
      >
    >;
  };
}
