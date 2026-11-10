import { describe, expect, it } from "vitest";
import {
  creditsOf,
  frontMatterOf,
  hasIcon,
  isDate,
  isPicture,
  notAPicture,
  pageWithoutIcon,
  pictureName,
  startOf,
  withCredits,
  withoutIcon,
} from "../../src/domain/course-details.ts";

describe("credits", () => {
  it("reads the credits line, unquoted, and none from a commented example", () => {
    expect(creditsOf("credits: Leigh\n")).toBe("Leigh");
    expect(creditsOf('credits: "Leigh: Web"\n')).toBe("Leigh: Web");
    expect(creditsOf("# credits: Your Name\n")).toBe("");
  });
  it("replaces the line, fills in the commented example, or adds one at the end", () => {
    expect(withCredits("a: 1\ncredits: Old\nb: 2\n", "New  Name")).toBe("a: 1\ncredits: New Name\nb: 2\n");
    expect(withCredits("# credits: Your Name\n", "Leigh")).toBe("credits: Leigh\n");
    expect(withCredits("a: 1", "Leigh")).toBe("a: 1\ncredits: Leigh\n");
    expect(withCredits("", "Leigh")).toBe("credits: Leigh\n");
  });
  it("quotes credits YAML would misread, and takes the line out when emptied", () => {
    expect(withCredits("", "Leigh: Web")).toBe('credits: "Leigh: Web"\n');
    expect(withCredits("", "- Leigh")).toBe('credits: "- Leigh"\n');
    expect(withCredits("a: 1\ncredits: Old\n", " ")).toBe("a: 1\n");
    expect(withCredits("a: 1\n", "")).toBe("a: 1\n");
  });
});

describe("dates", () => {
  it("knows a real date and finds a calendar's first", () => {
    expect(isDate("2027-01-25")).toBe(true);
    expect(isDate("2027-02-30")).toBe(false);
    expect(isDate("25/01/2027")).toBe(false);
    expect(startOf("title: x\nweeks:\n  - date: 2027-01-25\n    week: 1\n  - date: 2027-02-01\n")).toBe("2027-01-25");
    expect(startOf("title: x\n")).toBeNull();
  });
});

describe("icons", () => {
  it("takes a top-level icon and its settings out of YAML", () => {
    expect(withoutIcon("icon:\n  type: a\n  color: b\ncredits: L\n")).toBe("credits: L\n");
    expect(withoutIcon("credits: L\nicon:\n  type: a\n")).toBe("credits: L\n");
    expect(withoutIcon("credits: L\n")).toBe("credits: L\n");
    expect(hasIcon("x: 1\nicon:\n  type: a")).toBe(true);
    expect(hasIcon("x: 1\n  icon: a")).toBe(false);
  });
  it("takes the icon out of a page's front matter, and empty front matter with it", () => {
    expect(pageWithoutIcon("---\nicon:\n  type: a\n---\n\n# Week 1\n")).toBe("# Week 1\n");
    expect(pageWithoutIcon("---\nicon:\n  type: a\nvideo: x\n---\n\n# Week 1\n")).toBe("---\nvideo: x\n---\n\n# Week 1\n");
    expect(pageWithoutIcon("# Week 1\n")).toBe("# Week 1\n");
    expect(frontMatterOf("---\nicon: a\n---\n# T\n")).toBe("icon: a");
    expect(frontMatterOf("# T\n")).toBe("");
  });
});

describe("pictures", () => {
  it("knows a picture by its kind and keeps it under a plain name", () => {
    expect(isPicture("a/My Diagram.PNG")).toBe(true);
    expect(isPicture("slides.pdf")).toBe(false);
    expect(isPicture("noextension")).toBe(false);
    expect(pictureName("a/My Diagram.PNG")).toBe("my-diagram.png");
    expect(pictureName("--.jpg")).toBe("picture.jpg");
    expect(notAPicture("x/slides.pdf")).toBe('"slides.pdf" is not a picture a card can show. Choose a PNG, JPG, JPEG, GIF or SVG file.');
  });
});
