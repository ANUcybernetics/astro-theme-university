import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Footer from "./Footer.astro";

describe("Footer", () => {
  test("renders no institutional content by default", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: { name: "Test Site" },
    });

    expect(html).not.toContain("at-footer-band");
    expect(html).not.toContain("at-footer-acknowledgement");
    // The legal row still renders (it hosts the theme toggle) but holds no links.
    expect(html).toContain('aria-label="Legal"');
    expect(html).not.toContain("at-footer-meta");
  });

  test("renders acknowledgement, band logo, and partnerships from props", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        name: "Test Site",
        acknowledgement: {
          title: "Acknowledgement of Country",
          text: "Test University acknowledges the traditional owners.",
          logo: { src: "/test-lockup.svg", width: 200, height: 60, format: "svg" },
          logoAlt: "Test University",
        },
        partnerships: [{ text: "Partner", href: "https://example.com", logo: "/partner.svg" }],
        legalLinks: [{ text: "Privacy", href: "https://example.com/privacy" }],
        meta: ["Provider ID: TEST123"],
      },
    });

    expect(html).toContain("at-footer-band");
    expect(html).toContain('alt="Test University"');
    expect(html).toContain("Acknowledgement of Country");
    expect(html).toContain("traditional owners");
    expect(html).toContain('aria-label="Partner"');
    expect(html).toContain("Privacy");
    expect(html).toContain("Provider ID: TEST123");
  });

  test("renders contact info when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        name: "Test Site",
        contact: {
          email: "test@example.edu",
          phone: "+61 2 6125 0000",
        },
      },
    });

    expect(html).toContain("Contact us");
    expect(html).toContain("test@example.edu");
    expect(html).toContain('href="mailto:test@example.edu"');
    expect(html).toContain('href="tel:+61261250000"');
  });

  test("renders social links with aria-labels", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        name: "Test Site",
        socials: [{ platform: "facebook", url: "https://facebook.com/example" }],
      },
    });

    expect(html).toContain('aria-label="Social links"');
    expect(html).toContain('aria-label="facebook"');
    expect(html).toContain('href="https://facebook.com/example"');
  });

  test("renders licence info when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: { name: "Test Site", licence: "CC-BY-4.0" },
    });

    expect(html).toContain("Creative Commons Attribution 4.0 International");
    expect(html).toContain('rel="license"');
  });

  test("renders the theme toggle button when colorScheme is 'auto' (default)", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: { name: "Test" },
    });
    expect(html).toContain("at-footer-theme-toggle");
  });

  test("omits the theme toggle button when colorScheme is forced", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: { name: "Test", colorScheme: "dark" },
    });
    expect(html).not.toContain("at-footer-theme-toggle");
  });

  test("omits the band when acknowledgement has no logo and no partnerships", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
      props: {
        name: "Test",
        acknowledgement: { text: "Acknowledgement text only." },
      },
    });
    expect(html).not.toContain("at-footer-band");
    expect(html).toContain("Acknowledgement text only.");
  });
});
