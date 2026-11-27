import { renderToString } from "react-dom/server";
import { Linkify } from "./Linkify";
import { test, expect } from "vitest";
test("links", () => {
  const h = renderToString(<Linkify text="سلام https://t.me/alish، و www.google.com و alish.af/x." />);
  expect(h).toContain('href="https://t.me/alish"');
  expect(h).toContain('href="https://www.google.com/"');
  expect(h).toContain('href="https://alish.af/x"');
  expect(renderToString(<Linkify text="javascript:alert(1)" />)).not.toContain("href");
});
