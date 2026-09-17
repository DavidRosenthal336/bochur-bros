/** Scene identifiers, in one place so nothing depends on a loose string. */
export const SceneKey = {
  Boot: 'Boot',
  Level: 'Level',
} as const;

export type SceneKey = (typeof SceneKey)[keyof typeof SceneKey];
