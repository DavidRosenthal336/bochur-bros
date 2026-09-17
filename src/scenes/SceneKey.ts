/** Scene identifiers, in one place so nothing depends on a loose string. */
export const SceneKey = {
  Boot: 'Boot',
  TestLevel: 'TestLevel',
} as const;

export type SceneKey = (typeof SceneKey)[keyof typeof SceneKey];
