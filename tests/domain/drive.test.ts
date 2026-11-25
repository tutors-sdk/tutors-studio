import { describe, expect, it } from "vitest";
import { driveFolder, driveFolderId, folderIdFromLink, folderLabel, isDriveFolder } from "../../src/domain/drive.ts";
import { lastPart } from "../../src/domain/library.ts";

describe("Google Drive folders in the library", () => {
  it("keeps a Drive folder as its id and name, and shows its name", () => {
    const folder = driveFolder("1AbCdEfGhIjK", "Shared/Teaching");
    expect(folder).toBe("gdrive:1AbCdEfGhIjK/Shared-Teaching");
    expect(isDriveFolder(folder)).toBe(true);
    expect(driveFolderId(folder)).toBe("1AbCdEfGhIjK");
    expect(lastPart(folder)).toBe("Shared-Teaching");
    expect(driveFolderId("/home/leigh/Teaching")).toBeNull();
    expect(folderLabel(folder)).toBe("Google Drive: Shared-Teaching");
    expect(folderLabel("/home/leigh/Teaching")).toBe("/home/leigh/Teaching");
  });

  it("finds the folder id in a link or a bare id, and nothing in other text", () => {
    for (const link of [
      "https://drive.google.com/drive/folders/1AbCdEfGhIjK_-x?usp=sharing",
      "https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjK_-x",
      "https://drive.google.com/open?id=1AbCdEfGhIjK_-x",
      " 1AbCdEfGhIjK_-x ",
    ])
      expect(folderIdFromLink(link), link).toBe("1AbCdEfGhIjK_-x");
    expect(folderIdFromLink("my teaching folder")).toBeNull();
  });
});
