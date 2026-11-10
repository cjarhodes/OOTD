import { describe, expect, it } from "vitest";
import { addedMessage, nameList, recolouredMessage, removedMessage, swipeMessage, UNDONE, SKIPPED, wishlistMessage, withEnding } from "./announce";

describe("announcements", () => {
  it("lists names in lower case, with and before the last", () => {
    expect(nameList([])).toBe("");
    expect(nameList(["White Heavyweight tee"])).toBe("white heavyweight tee");
    expect(nameList(["White tee", "Black tee"])).toBe("white tee and black tee");
    expect(nameList(["A", "B", "C"])).toBe("a, b and c");
  });

  it("names up to three added pieces and counts more", () => {
    expect(addedMessage(["White heavyweight tee", "Black heavyweight tee"])).toBe("Added white heavyweight tee and black heavyweight tee");
    expect(addedMessage(["A", "B", "C"])).toBe("Added a, b and c");
    expect(addedMessage(["A", "B", "C", "D"])).toBe("Added 4 pieces");
    expect(addedMessage([])).toBe("Nothing added");
  });

  it("says what went on the wishlist and what was removed", () => {
    expect(wishlistMessage(["Suede loafers"])).toBe("On your wishlist: suede loafers");
    expect(removedMessage("White tee")).toBe("Removed white tee");
    expect(recolouredMessage("White tee", "Grey")).toBe("Changed white tee to grey");
  });

  it("says what a swipe did", () => {
    expect(swipeMessage("skip", [], [])).toBe(SKIPPED);
    expect(swipeMessage("have", ["White tee"], [])).toBe("Added white tee");
    expect(swipeMessage("want", [], ["Suede loafers"])).toBe("On your wishlist: suede loafers");
    expect(swipeMessage("have", [], [])).toBe("Nothing new to add");
    expect(UNDONE).toBe("Undone");
  });

  it("adds how a round ended", () => {
    expect(withEnding("Skipped", null)).toBe("Skipped");
    expect(withEnding("Skipped", "The basics done")).toBe("Skipped. The basics done");
  });
});
