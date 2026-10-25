/**
 * Recherche un dossier par nom dans tous les Drives partager
 * @param name Nom du dossier
 */
export function findSharedFolderByName(name: string): GoogleAppsScript.Drive.Folder | undefined {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : undefined;
}